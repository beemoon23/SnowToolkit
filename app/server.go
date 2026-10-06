package main

import (
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"time"
)

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func readJSON(r *http.Request, v any) error {
	defer r.Body.Close()
	return json.NewDecoder(io.LimitReader(r.Body, 8<<20)).Decode(v)
}

// guard protege tudo: so aceita Host local, cookie com o token e, em escrita, Origin local.
func (a *App) guard(h http.HandlerFunc) http.HandlerFunc {
	hostOK := map[string]bool{
		fmt.Sprintf("127.0.0.1:%d", a.Port): true,
		fmt.Sprintf("localhost:%d", a.Port): true,
	}
	return func(w http.ResponseWriter, r *http.Request) {
		if !hostOK[r.Host] {
			http.Error(w, "host invalido", http.StatusForbidden)
			return
		}
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "no-referrer")
		// primeira abertura: ?t=TOKEN vira cookie e redireciona
		if t := r.URL.Query().Get("t"); t != "" && r.Method == http.MethodGet && !strings.HasPrefix(r.URL.Path, "/api/") {
			if subtle.ConstantTimeCompare([]byte(t), []byte(a.Token)) == 1 {
				http.SetCookie(w, &http.Cookie{Name: "snow", Value: a.Token, Path: "/", HttpOnly: true, SameSite: http.SameSiteStrictMode})
				http.Redirect(w, r, "/", http.StatusFound)
				return
			}
		}
		c, err := r.Cookie("snow")
		if err != nil || subtle.ConstantTimeCompare([]byte(c.Value), []byte(a.Token)) != 1 {
			http.Error(w, "acesso negado: abra o SnowToolkit pelo programa", http.StatusForbidden)
			return
		}
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			if o := r.Header.Get("Origin"); o != "" && o != fmt.Sprintf("http://127.0.0.1:%d", a.Port) && o != fmt.Sprintf("http://localhost:%d", a.Port) {
				http.Error(w, "origem invalida", http.StatusForbidden)
				return
			}
		}
		h(w, r)
	}
}

var reParam = regexp.MustCompile(`^[A-Za-z0-9_]{1,40}$`)
var reID = regexp.MustCompile(`^[a-z0-9_]{1,40}$`)

func paramsToEnv(p map[string]string) []string {
	var env []string
	for k, v := range p {
		if !reParam.MatchString(k) || len(v) > 200000 {
			continue
		}
		env = append(env, "SNOW_ARG_"+strings.ToUpper(k)+"="+v)
	}
	return env
}

func (a *App) routes(static http.Handler) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/", a.guard(func(w http.ResponseWriter, r *http.Request) { static.ServeHTTP(w, r) }))

	mux.HandleFunc("GET /api/ping", a.guard(func(w http.ResponseWriter, r *http.Request) {
		a.lastPing.Store(time.Now().UnixNano())
		a.pinged.Store(true)
		writeJSON(w, 200, map[string]any{"ok": true})
	}))
	mux.HandleFunc("GET /api/about", a.guard(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, map[string]any{"version": Version, "port": a.Port, "dataDir": a.DataDir, "demo": a.Demo, "admin": isAdmin(), "os": runtime.GOOS, "pid": os.Getpid()})
	}))
	mux.HandleFunc("POST /api/shutdown", a.guard(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, map[string]any{"ok": true})
		go func() {
			time.Sleep(200 * time.Millisecond)
			a.Quit()
		}()
	}))
	mux.HandleFunc("GET /api/metrics", a.guard(func(w http.ResponseWriter, r *http.Request) { writeJSON(w, 200, currentMetrics()) }))

	// consultas (JSON sincrono)
	mux.HandleFunc("POST /api/query", a.guard(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			ID     string            `json:"id"`
			Params map[string]string `json:"params"`
		}
		if err := readJSON(r, &req); err != nil || !reID.MatchString(req.ID) {
			writeJSON(w, 400, map[string]any{"error": "requisição inválida"})
			return
		}
		out, err := a.runQuery(r.Context(), req.ID, req.Params)
		if err != nil {
			writeJSON(w, 502, map[string]any{"error": err.Error()})
			return
		}
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		_, _ = w.Write(out)
	}))

	// acoes e scripts (jobs com saida ao vivo)
	mux.HandleFunc("POST /api/action", a.guard(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			ID     string            `json:"id"`
			Name   string            `json:"name"`
			Params map[string]string `json:"params"`
		}
		if err := readJSON(r, &req); err != nil || !reID.MatchString(req.ID) {
			writeJSON(w, 400, map[string]any{"error": "requisição inválida"})
			return
		}
		src, err := psFS.ReadFile("ps/a_" + req.ID + ".ps1")
		if err != nil {
			writeJSON(w, 404, map[string]any{"error": "ação desconhecida"})
			return
		}
		name := req.Name
		if name == "" {
			name = req.ID
		}
		j := a.jobs.Start(name, string(src), paramsToEnv(req.Params))
		writeJSON(w, 200, map[string]any{"id": j.ID})
	}))
	mux.HandleFunc("POST /api/run", a.guard(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Name   string            `json:"name"`
			Script string            `json:"script"`
			Params map[string]string `json:"params"`
		}
		if err := readJSON(r, &req); err != nil || strings.TrimSpace(req.Script) == "" {
			writeJSON(w, 400, map[string]any{"error": "script vazio"})
			return
		}
		if req.Name == "" {
			req.Name = "Script"
		}
		j := a.jobs.Start(req.Name, req.Script, paramsToEnv(req.Params))
		writeJSON(w, 200, map[string]any{"id": j.ID})
	}))
	mux.HandleFunc("GET /api/jobs", a.guard(func(w http.ResponseWriter, r *http.Request) { writeJSON(w, 200, a.jobs.List()) }))
	mux.HandleFunc("GET /api/jobs/{id}/events", a.guard(a.jobs.serveEvents))
	mux.HandleFunc("POST /api/jobs/{id}/cancel", a.guard(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, map[string]any{"ok": a.jobs.Cancel(r.PathValue("id"))})
	}))
	mux.HandleFunc("GET /api/history", a.guard(func(w http.ResponseWriter, r *http.Request) { writeJSON(w, 200, a.jobs.History(200)) }))
	mux.HandleFunc("GET /api/history/log", a.guard(func(w http.ResponseWriter, r *http.Request) {
		f := filepath.Base(r.URL.Query().Get("f"))
		if !strings.HasSuffix(f, ".log") {
			http.Error(w, "arquivo invalido", 400)
			return
		}
		b, err := os.ReadFile(filepath.Join(a.DataDir, "logs", f))
		if err != nil {
			http.Error(w, "nao encontrado", 404)
			return
		}
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		_, _ = w.Write(b)
	}))

	// utilidades
	mux.HandleFunc("GET /api/store", a.guard(func(w http.ResponseWriter, r *http.Request) {
		b, err := os.ReadFile(filepath.Join(a.DataDir, "settings.json"))
		if err != nil || !json.Valid(b) {
			b = []byte("{}")
		}
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		_, _ = w.Write(b)
	}))
	mux.HandleFunc("PUT /api/store", a.guard(func(w http.ResponseWriter, r *http.Request) {
		b, err := io.ReadAll(io.LimitReader(r.Body, 2<<20))
		if err != nil || !json.Valid(b) {
			writeJSON(w, 400, map[string]any{"error": "json inválido"})
			return
		}
		tmp := filepath.Join(a.DataDir, "settings.json.tmp")
		if err := os.WriteFile(tmp, b, 0o644); err == nil {
			_ = os.Rename(tmp, filepath.Join(a.DataDir, "settings.json"))
		}
		writeJSON(w, 200, map[string]any{"ok": true})
	}))
	mux.HandleFunc("POST /api/save", a.guard(a.handleSave))
	mux.HandleFunc("POST /api/open", a.guard(a.handleOpen))
	mux.HandleFunc("POST /api/launch", a.guard(a.handleLaunch))
	mux.HandleFunc("POST /api/wol", a.guard(a.handleWOL))
	mux.HandleFunc("POST /api/pingmon", a.guard(a.handlePingMon))

	// analisador de espaço (mapa de blocos)
	mux.HandleFunc("POST /api/diskscan", a.guard(a.handleScanStart))
	mux.HandleFunc("GET /api/diskscan/{id}", a.guard(a.handleScanStatus))
	mux.HandleFunc("POST /api/diskscan/{id}/cancel", a.guard(a.handleScanCancel))
	mux.HandleFunc("GET /api/diskscan/{id}/tree", a.guard(a.handleScanTree))
	mux.HandleFunc("POST /api/diskscan/{id}/reveal", a.guard(a.handleScanReveal))
	return mux
}
