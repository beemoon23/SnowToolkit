package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

// Atualização automática pelo GitHub (mesmo esquema do SnowDownloader e do SnowShot).
// O GitHub Actions compila a cada commit na main e publica a release "latest"
// (com SnowToolkit.exe e SnowToolkit-Setup.exe). O app compara o código do build.

// buildID é preenchido pelo GitHub Actions na hora de compilar
// (-X main.buildID=<sha>). Em compilação local fica "dev" e não se atualiza.
var buildID = "dev"

var updateAPI = "https://api.github.com/repos/beemoon23/SnowToolkit/releases/tags/latest"

const exeAsset = "SnowToolkit.exe"

var buildRe = regexp.MustCompile(`build:([0-9a-f]{7,40})`)

type remoteInfo struct {
	Build  string
	URL    string
	Digest string // "sha256:<hex>" informado pelo GitHub (pode vir vazio)
}

func sameBuild(a, b string) bool {
	return a != "" && b != "" && (strings.HasPrefix(a, b) || strings.HasPrefix(b, a))
}

// fetchRemote lê a release "latest" do GitHub e devolve o build e o link do .exe.
func fetchRemote() (remoteInfo, error) {
	req, err := http.NewRequest("GET", updateAPI, nil)
	if err != nil {
		return remoteInfo{}, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "SnowToolkit")

	resp, err := (&http.Client{Timeout: 20 * time.Second}).Do(req)
	if err != nil {
		return remoteInfo{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return remoteInfo{}, fmt.Errorf("o GitHub respondeu %s", resp.Status)
	}

	var rel struct {
		Body   string `json:"body"`
		Assets []struct {
			Name   string `json:"name"`
			URL    string `json:"browser_download_url"`
			Digest string `json:"digest"`
		} `json:"assets"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&rel); err != nil {
		return remoteInfo{}, err
	}

	var info remoteInfo
	if m := buildRe.FindStringSubmatch(rel.Body); m != nil {
		info.Build = m[1]
	}
	for _, as := range rel.Assets {
		if strings.EqualFold(as.Name, exeAsset) {
			info.URL, info.Digest = as.URL, as.Digest
		}
	}
	if info.Build == "" || info.URL == "" {
		return remoteInfo{}, fmt.Errorf("a release publicada não tem o formato esperado")
	}
	return info, nil
}

// downloadFile baixa uma URL para dest e devolve o SHA-256 do que baixou.
func downloadFile(url, dest string) (string, error) {
	resp, err := (&http.Client{Timeout: 10 * time.Minute}).Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("servidor respondeu %s", resp.Status)
	}
	tmp := dest + ".part"
	out, err := os.Create(tmp)
	if err != nil {
		return "", err
	}
	h := sha256.New()
	if _, err := io.Copy(io.MultiWriter(out, h), resp.Body); err != nil {
		out.Close()
		os.Remove(tmp)
		return "", err
	}
	if err := out.Close(); err != nil {
		os.Remove(tmp)
		return "", err
	}
	os.Remove(dest)
	if err := os.Rename(tmp, dest); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

// swapExe baixa o .exe novo e troca pelo atual. O Windows deixa RENOMEAR um
// programa em execução (só não deixa apagar/sobrescrever), então o atual vira
// ".old" e o novo ocupa o lugar. Devolve o caminho do .exe para reabrir.
func swapExe(r remoteInfo) (string, error) {
	exe, err := os.Executable()
	if err != nil {
		return "", err
	}
	if p, err := filepath.EvalSymlinks(exe); err == nil {
		exe = p
	}
	newPath := exe + ".new"
	oldPath := exe + ".old"

	sum, err := downloadFile(r.URL, newPath)
	if err != nil {
		return "", fmt.Errorf("falha ao baixar: %w", err)
	}
	fail := func(msg string) (string, error) {
		os.Remove(newPath)
		return "", fmt.Errorf("%s", msg)
	}

	// Confere o tamanho, o formato de programa do Windows ("MZ") e o hash informado pelo GitHub.
	st, err := os.Stat(newPath)
	if err != nil || st.Size() < 1<<20 {
		return fail("o arquivo baixado veio incompleto")
	}
	if f, err := os.Open(newPath); err == nil {
		head := make([]byte, 2)
		_, _ = f.Read(head)
		f.Close()
		if string(head) != "MZ" {
			return fail("o arquivo baixado não é um programa válido")
		}
	}
	if want := strings.TrimPrefix(strings.ToLower(r.Digest), "sha256:"); len(want) == 64 && want != sum {
		return fail("a verificação de integridade (SHA-256) do arquivo baixado falhou")
	}

	os.Remove(oldPath)
	if err := os.Rename(exe, oldPath); err != nil {
		os.Remove(newPath)
		return "", fmt.Errorf("não consegui trocar o programa (%v). Se ele está em \"Arquivos de Programas\", reinstale pelo Setup mais recente", err)
	}
	if err := os.Rename(newPath, exe); err != nil {
		_ = os.Rename(oldPath, exe) // volta o antigo
		return "", err
	}
	return exe, nil
}

// cleanupOldExe apaga restos de atualizações anteriores.
func cleanupOldExe() {
	if exe, err := os.Executable(); err == nil {
		os.Remove(exe + ".old")
		os.Remove(exe + ".new")
	}
}

func (a *App) busyJobs() int {
	n := 0
	for _, j := range a.jobs.List() {
		if !j.Done {
			n++
		}
	}
	return n
}

var updMu sync.Mutex

func (a *App) updateRoutes(mux *http.ServeMux) {
	// GET: há versão nova? (a interface chama na abertura e no botão da página Sobre)
	mux.HandleFunc("GET /api/update", a.guard(func(w http.ResponseWriter, r *http.Request) {
		resp := map[string]any{"version": Version, "build": buildID, "canUpdate": buildID != "dev" && !a.Demo}
		if buildID == "dev" || a.Demo {
			writeJSON(w, 200, resp)
			return
		}
		ri, err := fetchRemote()
		if err != nil {
			resp["error"] = err.Error()
			writeJSON(w, 200, resp)
			return
		}
		resp["remote"] = ri.Build
		resp["available"] = !sameBuild(ri.Build, buildID)
		writeJSON(w, 200, resp)
	}))

	// POST: baixa, troca o .exe e reabre o programa.
	mux.HandleFunc("POST /api/update/apply", a.guard(func(w http.ResponseWriter, r *http.Request) {
		if buildID == "dev" || a.Demo {
			writeJSON(w, 400, map[string]any{"error": "Esta cópia não se atualiza sozinha (modo demo ou compilada fora do GitHub)."})
			return
		}
		if !updMu.TryLock() {
			writeJSON(w, 409, map[string]any{"error": "Uma atualização já está em andamento."})
			return
		}
		defer updMu.Unlock()
		if n := a.busyJobs(); n > 0 {
			writeJSON(w, 409, map[string]any{"error": fmt.Sprintf("Há %d tarefa(s) em execução. Espere terminar para atualizar.", n)})
			return
		}
		ri, err := fetchRemote()
		if err != nil {
			writeJSON(w, 502, map[string]any{"error": "Não consegui consultar o GitHub: " + err.Error()})
			return
		}
		if sameBuild(ri.Build, buildID) {
			writeJSON(w, 200, map[string]any{"ok": true, "already": true})
			return
		}
		exe, err := swapExe(ri)
		if err != nil {
			writeJSON(w, 500, map[string]any{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"ok": true, "build": ri.Build})
		go func() {
			time.Sleep(400 * time.Millisecond)
			cmd := exec.Command(exe)
			cmd.Dir = filepath.Dir(exe)
			_ = cmd.Start()
			time.Sleep(300 * time.Millisecond)
			a.Quit()
		}()
	}))
}
