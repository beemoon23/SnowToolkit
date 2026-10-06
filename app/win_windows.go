//go:build windows

package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"syscall"
	"unsafe"

	webview2 "github.com/jchv/go-webview2"
	"github.com/jchv/go-webview2/webviewloader"
)

func fatal(msg string) {
	u := syscall.NewLazyDLL("user32.dll").NewProc("MessageBoxW")
	t, _ := syscall.UTF16PtrFromString("SnowToolkit")
	m, _ := syscall.UTF16PtrFromString(msg)
	u.Call(0, uintptr(unsafe.Pointer(m)), uintptr(unsafe.Pointer(t)), 0x10)
	os.Exit(1)
}

func isAdmin() bool {
	var token syscall.Token
	proc, err := syscall.GetCurrentProcess()
	if err != nil {
		return false
	}
	if err := syscall.OpenProcessToken(proc, syscall.TOKEN_QUERY, &token); err != nil {
		return false
	}
	defer token.Close()
	var elevated, ret uint32
	gti := syscall.NewLazyDLL("advapi32.dll").NewProc("GetTokenInformation")
	r, _, _ := gti.Call(uintptr(token), 20, uintptr(unsafe.Pointer(&elevated)), 4, uintptr(unsafe.Pointer(&ret)))
	return r != 0 && elevated != 0
}

// openWindow abre a interface numa janela do proprio programa (WebView2 embutido, sem navegador).
// Ordem: 1) WebView2; 2) Edge/Chrome em modo app; 3) navegador padrao.
// Ao fechar a janela do WebView2, onClose encerra o programa. Defina SNOW_BROWSER=1 para forcar o modo navegador.
func openWindow(url, dataDir string, onClose func()) {
	if os.Getenv("SNOW_BROWSER") == "" && openWebView2(url, dataDir, onClose) {
		return
	}
	openBrowserApp(url, dataDir)
}

func screenSize() (int, int) {
	gsm := syscall.NewLazyDLL("user32.dll").NewProc("GetSystemMetrics")
	w, _, _ := gsm.Call(0) // SM_CXSCREEN
	h, _, _ := gsm.Call(1) // SM_CYSCREEN
	return int(w), int(h)
}

// openWebView2 devolve false se o runtime do WebView2 nao estiver instalado ou a janela nao puder ser criada.
// A checagem previa e obrigatoria: a biblioteca encerra o processo (log.Fatal) se o runtime faltar.
func openWebView2(url, dataDir string, onClose func()) bool {
	ver, err := webviewloader.GetInstalledVersion()
	if err != nil || ver == "" {
		return false
	}
	// A janela e o laco de mensagens precisam ficar na mesma thread do sistema.
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	sw, sh := screenSize()
	ww, wh := 1440, 900
	if sw > 0 && ww > sw*92/100 {
		ww = sw * 92 / 100
	}
	if sh > 0 && wh > sh*88/100 {
		wh = sh * 88 / 100
	}
	if ww < 960 {
		ww = 960
	}
	if wh < 600 {
		wh = 600
	}

	w := webview2.NewWithOptions(webview2.WebViewOptions{
		DataPath:  filepath.Join(dataDir, "webview2"),
		AutoFocus: true,
		WindowOptions: webview2.WindowOptions{
			Title: "SnowToolkit", Width: uint(ww), Height: uint(wh), IconId: 1, Center: true,
		},
	})
	if w == nil {
		return false
	}
	w.Navigate(url)
	w.Run() // bloqueia ate a janela ser fechada
	if onClose != nil {
		onClose()
	}
	return true
}

// openBrowserApp: reserva quando nao ha WebView2 (Edge/Chrome em modo app; sem eles, o navegador padrao).
func openBrowserApp(url, dataDir string) {
	pf, pf86, la := os.Getenv("ProgramFiles"), os.Getenv("ProgramFiles(x86)"), os.Getenv("LOCALAPPDATA")
	cands := []string{
		filepath.Join(pf86, `Microsoft\Edge\Application\msedge.exe`),
		filepath.Join(pf, `Microsoft\Edge\Application\msedge.exe`),
		filepath.Join(pf, `Google\Chrome\Application\chrome.exe`),
		filepath.Join(pf86, `Google\Chrome\Application\chrome.exe`),
		filepath.Join(la, `Google\Chrome\Application\chrome.exe`),
	}
	profile := filepath.Join(dataDir, "webprofile")
	for _, c := range cands {
		if _, err := os.Stat(c); err != nil {
			continue
		}
		cmd := exec.Command(c, "--app="+url, "--user-data-dir="+profile, "--no-first-run", "--no-default-browser-check",
			"--window-size=1440,900", "--disable-features=Translate,msEdgeSidebarV2", "--disable-extensions")
		if cmd.Start() == nil {
			go cmd.Wait()
			return
		}
	}
	cmd := exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	_ = cmd.Start()
}
