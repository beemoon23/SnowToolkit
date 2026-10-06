// SnowToolkit - central de ferramentas de T.I. para Windows.
// Um unico executavel: servidor local seguro (127.0.0.1 + token) e interface em janela propria (WebView2 embutido;
// se o runtime nao existir, cai para Edge/Chrome em modo app e, por fim, para o navegador padrao).
package main

import (
	"context"
	"crypto/rand"
	"embed"
	"encoding/hex"
	"flag"
	"fmt"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"sync"
	"sync/atomic"
	"syscall"
	"time"
)

const Version = "2.3.2"

//go:embed web
var webFS embed.FS

//go:embed ps/*.ps1
var psFS embed.FS

type App struct {
	Token    string
	Port     int
	DataDir  string
	Demo     bool
	started  time.Time
	lastPing atomic.Int64
	pinged   atomic.Bool
	jobs     *JobManager
	srv      *http.Server
	quit     chan struct{}
	quitOnce sync.Once
	querySem chan struct{}
}

// Quit pede o encerramento do programa (seguro para chamar varias vezes, de qualquer goroutine).
func (a *App) Quit() { a.quitOnce.Do(func() { close(a.quit) }) }

func newToken() string {
	b := make([]byte, 24)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func main() {
	demo := flag.Bool("demo", false, "modo demonstracao (dados ficticios, nada e executado)")
	noOpen := flag.Bool("no-open", false, "nao abrir a janela automaticamente")
	port := flag.Int("port", 0, "porta local (0 = automatica)")
	flag.Parse()

	app := &App{Token: newToken(), Demo: *demo, started: time.Now(), quit: make(chan struct{}), querySem: make(chan struct{}, 4)}
	app.DataDir = resolveDataDir()
	app.jobs = newJobManager(app)

	ln, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", *port))
	if err != nil {
		fatal("Não foi possível abrir a porta local: " + err.Error())
	}
	app.Port = ln.Addr().(*net.TCPAddr).Port

	sub, _ := fs.Sub(webFS, "web")
	mux := app.routes(http.FileServer(http.FS(sub)))
	app.srv = &http.Server{Handler: mux, ReadHeaderTimeout: 10 * time.Second}

	go startMetrics()
	go func() {
		if err := app.srv.Serve(ln); err != nil && err != http.ErrServerClosed {
			fatal("Falha no servidor local: " + err.Error())
		}
	}()
	go app.watchdog()

	url := fmt.Sprintf("http://127.0.0.1:%d/?t=%s", app.Port, app.Token)
	if *noOpen {
		fmt.Println(url)
	} else {
		go openWindow(url, app.DataDir, app.Quit)
	}

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
	select {
	case <-sig:
	case <-app.quit:
	}
	app.shutdown()
}

func (a *App) shutdown() {
	a.jobs.killAll()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	_ = a.srv.Shutdown(ctx)
	_ = os.RemoveAll(filepath.Join(a.DataDir, "tmp"))
}

// watchdog encerra o programa quando a janela e fechada (a interface envia um "ping" a cada poucos segundos).
func (a *App) watchdog() {
	t := time.NewTicker(5 * time.Second)
	defer t.Stop()
	for range t.C {
		if a.pinged.Load() {
			if time.Since(time.Unix(0, a.lastPing.Load())) > 30*time.Second {
				a.Quit()
				return
			}
		} else if time.Since(a.started) > 120*time.Second {
			a.Quit()
			return
		}
	}
}

func resolveDataDir() string {
	var base string
	if pd := os.Getenv("ProgramData"); pd != "" {
		base = filepath.Join(pd, "SnowToolkit")
	} else if h, err := os.UserHomeDir(); err == nil {
		base = filepath.Join(h, ".snowtoolkit")
	} else {
		base = filepath.Join(os.TempDir(), "snowtoolkit")
	}
	if err := os.MkdirAll(filepath.Join(base, "logs"), 0o755); err != nil {
		base = filepath.Join(os.TempDir(), "snowtoolkit")
		_ = os.MkdirAll(filepath.Join(base, "logs"), 0o755)
	}
	_ = os.MkdirAll(filepath.Join(base, "tmp"), 0o755)
	return base
}
