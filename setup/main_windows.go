//go:build windows

// Instalador do SnowToolkit: copia o programa para Arquivos de Programas, cria atalhos,
// registra a desinstalação em "Aplicativos e recursos" e oferece abrir ao final.
// Uso:  Setup.exe            (assistente simples com caixas de diálogo)
//
//	Setup.exe /S         (silencioso; atalho na Área de Trabalho com /desktop)
//	Setup.exe /nowebview2 (não instala o runtime WebView2, mesmo se faltar)
//	Setup.exe /uninstall (desinstala; também é o que "Uninstall.exe" executa)
//
// O SnowToolkit abre em janela própria usando o runtime WebView2 da Microsoft (já vem no Windows 11 e no
// Windows 10 atualizado). Se faltar, o instalador baixa o instalador oficial da Microsoft, confere a assinatura
// digital e instala em modo silencioso.
package main

import (
	"context"
	_ "embed"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"
	"unsafe"
)

//go:embed payload/SnowToolkit.exe
var payload []byte

const (
	appName    = "SnowToolkit"
	appVersion = "2.3.2"
	publisher  = "Guilherme Souto"
	uninstKey  = `HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\SnowToolkit`
)

var (
	user32     = syscall.NewLazyDLL("user32.dll")
	procMsgBox = user32.NewProc("MessageBoxW")
)

const (
	mbOK        = 0x0
	mbYesNo     = 0x4
	mbIconInfo  = 0x40
	mbIconQuest = 0x20
	mbIconError = 0x10
	idYes       = 6
)

func msgBox(title, text string, flags uintptr) int {
	t, _ := syscall.UTF16PtrFromString(title)
	m, _ := syscall.UTF16PtrFromString(text)
	r, _, _ := procMsgBox.Call(0, uintptr(unsafe.Pointer(m)), uintptr(unsafe.Pointer(t)), flags)
	return int(r)
}

func hidden(name string, args ...string) *exec.Cmd {
	c := exec.Command(name, args...)
	c.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
	return c
}

func installDir() string {
	pf := os.Getenv("ProgramFiles")
	if pf == "" {
		pf = `C:\Program Files`
	}
	return filepath.Join(pf, appName)
}

func startMenuLink() string {
	pd := os.Getenv("ProgramData")
	if pd == "" {
		pd = `C:\ProgramData`
	}
	return filepath.Join(pd, `Microsoft\Windows\Start Menu\Programs`, appName+".lnk")
}

func desktopLink() string {
	pub := os.Getenv("PUBLIC")
	if pub == "" {
		pub = `C:\Users\Public`
	}
	return filepath.Join(pub, "Desktop", appName+".lnk")
}

func makeLink(lnk, target, workdir string) error {
	ps := fmt.Sprintf(`$s=(New-Object -ComObject WScript.Shell).CreateShortcut('%s');$s.TargetPath='%s';$s.WorkingDirectory='%s';$s.IconLocation='%s,0';$s.Description='%s - Central de T.I.';$s.Save()`,
		strings.ReplaceAll(lnk, "'", "''"), strings.ReplaceAll(target, "'", "''"), strings.ReplaceAll(workdir, "'", "''"), strings.ReplaceAll(target, "'", "''"), appName)
	_ = os.MkdirAll(filepath.Dir(lnk), 0o755)
	return hidden("powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", ps).Run()
}

func regAdd(name, typ, val string) {
	_ = hidden("reg.exe", "add", uninstKey, "/v", name, "/t", typ, "/d", val, "/f").Run()
}

type options struct{ silent, desktop, uninstall, noWebView2 bool }

func parseArgs(args []string) (o options) {
	for _, a := range args {
		switch strings.ToLower(a) {
		case "/s", "-s", "/silent", "--silent", "/quiet":
			o.silent = true
		case "/desktop", "--desktop":
			o.desktop = true
		case "/uninstall", "--uninstall", "/u":
			o.uninstall = true
		case "/nowebview2", "--nowebview2":
			o.noWebView2 = true
		}
	}
	return
}

// ---------- runtime WebView2 ----------

const (
	wv2Client = `{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}`
	wv2URL    = "https://go.microsoft.com/fwlink/p/?LinkId=2124703" // bootstrapper oficial (Evergreen) da Microsoft
)

// webview2Installed procura a versao ("pv") do runtime no registro (maquina e usuario).
func webview2Installed() bool {
	keys := []string{
		`HKLM\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\` + wv2Client,
		`HKLM\SOFTWARE\Microsoft\EdgeUpdate\Clients\` + wv2Client,
		`HKCU\Software\Microsoft\EdgeUpdate\Clients\` + wv2Client,
	}
	for _, k := range keys {
		out, err := hidden("reg.exe", "query", k, "/v", "pv").Output()
		if err != nil {
			continue
		}
		for _, line := range strings.Split(string(out), "\n") {
			f := strings.Fields(line)
			if len(f) >= 3 && strings.EqualFold(f[0], "pv") {
				if v := f[len(f)-1]; v != "" && v != "0.0.0.0" {
					return true
				}
			}
		}
	}
	return false
}

func download(url, dest string) error {
	cl := &http.Client{Timeout: 5 * time.Minute}
	resp, err := cl.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	f, err := os.Create(dest)
	if err != nil {
		return err
	}
	n, err := io.Copy(f, resp.Body)
	if cerr := f.Close(); err == nil {
		err = cerr
	}
	if err == nil && n < 300*1024 {
		err = fmt.Errorf("arquivo baixado é pequeno demais (%d bytes)", n)
	}
	return err
}

// signedByMicrosoft confere se o arquivo tem assinatura digital valida da Microsoft Corporation.
func signedByMicrosoft(path string) bool {
	ps := `$s=Get-AuthenticodeSignature -LiteralPath '` + strings.ReplaceAll(path, "'", "''") + `'; if($s.Status -eq 'Valid' -and $s.SignerCertificate.Subject -match 'O=Microsoft Corporation'){'OK'}else{'NO'}`
	out, err := hidden("powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", ps).Output()
	return err == nil && strings.TrimSpace(string(out)) == "OK"
}

// ensureWebView2 baixa e instala o runtime se ele nao existir. Devolve um texto curto com o resultado.
func ensureWebView2() (string, error) {
	if webview2Installed() {
		return "já instalado", nil
	}
	dir, err := os.MkdirTemp("", "snow-wv2-")
	if err != nil {
		return "", err
	}
	defer os.RemoveAll(dir)
	exe := filepath.Join(dir, "MicrosoftEdgeWebview2Setup.exe")
	if err := download(wv2URL, exe); err != nil {
		return "", fmt.Errorf("download: %w", err)
	}
	if !signedByMicrosoft(exe) {
		return "", errors.New("a assinatura digital do instalador baixado não é válida; ele não foi executado")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()
	c := exec.CommandContext(ctx, exe, "/silent", "/install")
	c.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
	if err := c.Run(); err != nil {
		return "", fmt.Errorf("instalador da Microsoft: %w", err)
	}
	if !webview2Installed() {
		return "", errors.New("a instalação terminou, mas o runtime não foi detectado")
	}
	return "instalado agora", nil
}

// wv2Result guarda o resultado para a mensagem final.
var wv2Result string

func install(o options) error {
	dir := installDir()
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	_ = hidden("taskkill", "/F", "/IM", appName+".exe").Run() // fecha instância antiga, se houver
	exe := filepath.Join(dir, appName+".exe")
	if err := os.WriteFile(exe, payload, 0o755); err != nil {
		return fmt.Errorf("não foi possível gravar %s: %w", exe, err)
	}
	// o desinstalador é uma cópia deste mesmo programa
	self, _ := os.Executable()
	if b, err := os.ReadFile(self); err == nil {
		_ = os.WriteFile(filepath.Join(dir, "Uninstall.exe"), b, 0o755)
	}
	regAdd("DisplayName", "REG_SZ", appName)
	regAdd("DisplayVersion", "REG_SZ", appVersion)
	regAdd("Publisher", "REG_SZ", publisher)
	regAdd("InstallLocation", "REG_SZ", dir)
	regAdd("DisplayIcon", "REG_SZ", exe)
	regAdd("UninstallString", "REG_SZ", `"`+filepath.Join(dir, "Uninstall.exe")+`" /uninstall`)
	regAdd("NoModify", "REG_DWORD", "1")
	regAdd("NoRepair", "REG_DWORD", "1")
	regAdd("EstimatedSize", "REG_DWORD", fmt.Sprint(len(payload)*2/1024))
	if err := makeLink(startMenuLink(), exe, dir); err != nil {
		return fmt.Errorf("atalho do Menu Iniciar: %w", err)
	}
	if o.desktop {
		_ = makeLink(desktopLink(), exe, dir)
	}
	wv2Result = setupWebView2(o)
	return nil
}

// setupWebView2 nunca faz a instalacao falhar: sem o runtime o programa abre em Edge/Chrome (modo app).
func setupWebView2(o options) string {
	if o.noWebView2 {
		return "ignorado (/nowebview2)"
	}
	if webview2Installed() {
		return "já instalado"
	}
	if !o.silent && msgBox(appName, "O "+appName+" abre em janela própria usando o componente WebView2 da Microsoft, que não foi encontrado neste computador.\n\nBaixar e instalar agora? (precisa de internet e pode levar alguns minutos)\n\nSe responder Não, o programa abrirá usando o Edge/Chrome em modo aplicativo.", mbYesNo|mbIconQuest) != idYes {
		return "não instalado (escolha do usuário)"
	}
	r, err := ensureWebView2()
	if err != nil {
		return "falhou: " + err.Error()
	}
	return r
}

func uninstall(silent bool) error {
	dir := installDir()
	_ = hidden("taskkill", "/F", "/IM", appName+".exe").Run()
	_ = os.Remove(startMenuLink())
	_ = os.Remove(desktopLink())
	_ = hidden("reg.exe", "delete", uninstKey, "/f").Run()
	if !silent {
		pd := os.Getenv("ProgramData")
		data := filepath.Join(pd, appName)
		if st, err := os.Stat(data); err == nil && st.IsDir() {
			if msgBox(appName, "Apagar também os logs, o histórico e as configurações em\n"+data+" ?", mbYesNo|mbIconQuest) == idYes {
				_ = os.RemoveAll(data)
			}
		}
	}
	_ = os.Remove(filepath.Join(dir, appName+".exe"))
	// Uninstall.exe está em uso: remove a pasta logo depois que este processo terminar.
	_ = hidden("cmd.exe", "/c", "ping -n 3 127.0.0.1 >nul & rmdir /s /q \""+dir+"\"").Start()
	return nil
}

func main() {
	o := parseArgs(os.Args[1:])
	exeName := strings.ToLower(filepath.Base(os.Args[0]))
	if strings.Contains(exeName, "uninstall") {
		o.uninstall = true
	}
	if o.uninstall {
		if !o.silent && msgBox(appName, "Desinstalar o "+appName+" deste computador?", mbYesNo|mbIconQuest) != idYes {
			return
		}
		if err := uninstall(o.silent); err != nil {
			msgBox(appName, "Falha ao desinstalar: "+err.Error(), mbOK|mbIconError)
			os.Exit(1)
		}
		if !o.silent {
			msgBox(appName, "O "+appName+" foi desinstalado.", mbOK|mbIconInfo)
		}
		return
	}
	if !o.silent {
		if msgBox(appName+" "+appVersion+" — Instalação", "Instalar o "+appName+" "+appVersion+" em\n"+installDir()+" ?\n\nCentral de T.I. — "+publisher, mbYesNo|mbIconQuest) != idYes {
			return
		}
		o.desktop = msgBox(appName, "Criar também um atalho na Área de Trabalho?", mbYesNo|mbIconQuest) == idYes
	}
	if err := install(o); err != nil {
		if !o.silent {
			msgBox(appName, "Falha na instalação: "+err.Error(), mbOK|mbIconError)
		}
		os.Exit(1)
	}
	if o.silent {
		return
	}
	extra := "\n\nComponente WebView2: " + wv2Result + "."
	if strings.HasPrefix(wv2Result, "falhou") || strings.HasPrefix(wv2Result, "não instalado") {
		extra += "\nO programa funciona mesmo assim, abrindo no Edge/Chrome em modo aplicativo. Para ter a janela própria, instale o \"WebView2 Runtime\" da Microsoft."
	}
	if msgBox(appName, "Instalação concluída!"+extra+"\n\nAbrir o "+appName+" agora?", mbYesNo|mbIconInfo) == idYes {
		_ = exec.Command("explorer.exe", filepath.Join(installDir(), appName+".exe")).Start()
	}
}
