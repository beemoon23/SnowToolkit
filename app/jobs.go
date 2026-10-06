package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strings"
	"sync"
	"time"
)

type Line struct {
	K string `json:"k"`           // o = saida, e = erro, i = informacao do programa
	T string `json:"t"`           // texto
	R bool   `json:"r,omitempty"` // linha de progresso (substitui a anterior)
}

type Job struct {
	ID      string    `json:"id"`
	Name    string    `json:"name"`
	Started time.Time `json:"started"`
	Ended   time.Time `json:"ended"`
	Done    bool      `json:"done"`
	Exit    int       `json:"exit"`
	Cancel  bool      `json:"cancelled"`
	Log     string    `json:"log"`

	mu     sync.Mutex
	lines  []Line
	notify chan struct{}
	cmd    *exec.Cmd
	logf   *os.File
}

type JobManager struct {
	app   *App
	mu    sync.Mutex
	jobs  map[string]*Job
	order []string
	seq   int
}

func newJobManager(a *App) *JobManager { return &JobManager{app: a, jobs: map[string]*Job{}} }

var reSafeName = regexp.MustCompile(`[^A-Za-z0-9_\-]+`)
var reANSI = regexp.MustCompile("\x1b\\[[0-9;?]*[A-Za-z]")

func (j *Job) add(l Line) {
	j.mu.Lock()
	l.T = reANSI.ReplaceAllString(strings.ToValidUTF8(strings.ReplaceAll(l.T, "\x00", ""), "?"), "") // NULs: sobras de texto UTF-16
	j.lines = append(j.lines, l)
	if j.logf != nil && !l.R {
		_, _ = j.logf.WriteString(l.T + "\r\n")
	}
	old := j.notify
	j.notify = make(chan struct{})
	j.mu.Unlock()
	close(old)
}

func (m *JobManager) Start(name, script string, env []string) *Job {
	m.mu.Lock()
	m.seq++
	id := fmt.Sprintf("j%d", m.seq)
	now := time.Now()
	logName := fmt.Sprintf("%s_%s_%s.log", now.Format("20060102_150405"), id, strings.Trim(reSafeName.ReplaceAllString(name, "_"), "_"))
	if len(logName) > 90 {
		logName = logName[:86] + ".log"
	}
	j := &Job{ID: id, Name: name, Started: now, notify: make(chan struct{}), Log: logName}
	m.jobs[id] = j
	m.order = append(m.order, id)
	if len(m.order) > 60 {
		delete(m.jobs, m.order[0])
		m.order = m.order[1:]
	}
	m.mu.Unlock()

	if f, err := os.Create(filepath.Join(m.app.DataDir, "logs", logName)); err == nil {
		j.logf = f
		_, _ = f.WriteString("\xef\xbb\xbf# " + name + " - " + now.Format("02/01/2006 15:04:05") + "\r\n")
	}
	go m.run(j, script, env)
	return j
}

func (m *JobManager) run(j *Job, script string, env []string) {
	finish := func(code int) {
		j.mu.Lock()
		j.Done, j.Exit, j.Ended = true, code, time.Now()
		if j.logf != nil {
			_, _ = j.logf.WriteString(fmt.Sprintf("# fim (código %d, %s)\r\n", code, j.Ended.Sub(j.Started).Round(time.Millisecond)))
			_ = j.logf.Close()
			j.logf = nil
		}
		old := j.notify
		j.notify = make(chan struct{})
		j.mu.Unlock()
		close(old)
		m.persist(j)
	}

	ps := findPowerShell()
	if m.app.Demo || ps == "" {
		m.demoRun(j, script)
		finish(0)
		return
	}
	prelude, _ := psFS.ReadFile("ps/_prelude.ps1")
	native, _ := psFS.ReadFile("ps/_native.ps1") // saída correta (OEM/UTF-16) dos programas nativos; só nas ações
	full := "\xef\xbb\xbf" + string(prelude) + "\n" + string(native) + "\n" + script
	tmp := filepath.Join(m.app.DataDir, "tmp", j.ID+".ps1")
	if err := os.WriteFile(tmp, []byte(full), 0o600); err != nil {
		j.add(Line{K: "e", T: "Não foi possível preparar o script: " + err.Error()})
		finish(1)
		return
	}
	defer os.Remove(tmp)

	args := []string{"-NoProfile", "-NonInteractive"}
	if runtime.GOOS == "windows" {
		args = append(args, "-ExecutionPolicy", "Bypass")
	}
	args = append(args, "-File", tmp)
	cmd := exec.Command(ps, args...)
	cmd.Env = append(os.Environ(), env...)
	hideWindow(cmd)
	stdout, _ := cmd.StdoutPipe()
	stderr, _ := cmd.StderrPipe()
	j.mu.Lock()
	j.cmd = cmd
	j.mu.Unlock()
	if err := cmd.Start(); err != nil {
		j.add(Line{K: "e", T: "Falha ao iniciar o PowerShell: " + err.Error()})
		finish(1)
		return
	}
	var wg sync.WaitGroup
	wg.Add(2)
	go func() { defer wg.Done(); pump(stdout, "o", j) }()
	go func() { defer wg.Done(); pump(stderr, "e", j) }()
	wg.Wait()
	err := cmd.Wait()
	code := 0
	if err != nil {
		if ee, ok := err.(*exec.ExitError); ok {
			code = ee.ExitCode()
		} else {
			code = 1
		}
	}
	finish(code)
}

// pump le a saida e separa por \n e \r (barras de progresso do DISM/winget viram linhas "r").
func pump(r io.Reader, kind string, j *Job) {
	br := bufio.NewReaderSize(r, 64*1024)
	var buf bytes.Buffer
	flush := func(prog bool) {
		s := strings.TrimRight(buf.String(), " \t")
		buf.Reset()
		if strings.TrimSpace(s) == "" {
			return
		}
		j.add(Line{K: kind, T: s, R: prog})
	}
	for {
		b, err := br.ReadByte()
		if err != nil {
			flush(false)
			return
		}
		switch b {
		case '\n':
			flush(false)
		case '\r':
			if nb, e := br.Peek(1); e == nil && nb[0] == '\n' {
				_, _ = br.ReadByte()
				flush(false)
			} else {
				flush(true)
			}
		default:
			buf.WriteByte(b)
		}
	}
}

func (m *JobManager) Cancel(id string) bool {
	m.mu.Lock()
	j := m.jobs[id]
	m.mu.Unlock()
	if j == nil {
		return false
	}
	j.mu.Lock()
	cmd, done := j.cmd, j.Done
	j.Cancel = true
	j.mu.Unlock()
	if done {
		return false
	}
	j.add(Line{K: "i", T: "Cancelado pelo usuário."})
	if cmd != nil && cmd.Process != nil {
		killTree(cmd)
	}
	return true
}

func (m *JobManager) killAll() {
	m.mu.Lock()
	var list []*Job
	for _, j := range m.jobs {
		list = append(list, j)
	}
	m.mu.Unlock()
	for _, j := range list {
		j.mu.Lock()
		cmd, done := j.cmd, j.Done
		j.mu.Unlock()
		if !done && cmd != nil && cmd.Process != nil {
			killTree(cmd)
		}
	}
}

type jobInfo struct {
	ID      string    `json:"id"`
	Name    string    `json:"name"`
	Started time.Time `json:"started"`
	Ended   time.Time `json:"ended"`
	Done    bool      `json:"done"`
	Exit    int       `json:"exit"`
	Cancel  bool      `json:"cancelled"`
	Log     string    `json:"log"`
	Lines   int       `json:"lines"`
}

func (m *JobManager) List() []jobInfo {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]jobInfo, 0, len(m.order))
	for _, id := range m.order {
		j := m.jobs[id]
		j.mu.Lock()
		out = append(out, jobInfo{j.ID, j.Name, j.Started, j.Ended, j.Done, j.Exit, j.Cancel, j.Log, len(j.lines)})
		j.mu.Unlock()
	}
	sort.SliceStable(out, func(a, b int) bool { return out[a].Started.After(out[b].Started) })
	return out
}

// serveEvents envia as linhas do job por SSE (com reenvio desde ?from=N).
func (m *JobManager) serveEvents(w http.ResponseWriter, r *http.Request) {
	m.mu.Lock()
	j := m.jobs[r.PathValue("id")]
	m.mu.Unlock()
	if j == nil {
		http.Error(w, "job nao encontrado", 404)
		return
	}
	fl, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming indisponivel", 500)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("X-Accel-Buffering", "no")
	idx := 0
	fmt.Sscanf(r.URL.Query().Get("from"), "%d", &idx)
	tick := time.NewTicker(15 * time.Second)
	defer tick.Stop()
	for {
		j.mu.Lock()
		batch := append([]Line(nil), j.lines[min(idx, len(j.lines)):]...)
		idx = len(j.lines)
		done, exit, cancelled := j.Done, j.Exit, j.Cancel
		ch := j.notify
		j.mu.Unlock()
		for _, l := range batch {
			b, _ := json.Marshal(l)
			fmt.Fprintf(w, "event: line\ndata: %s\n\n", b)
		}
		if done {
			fmt.Fprintf(w, "event: done\ndata: {\"exit\":%d,\"cancelled\":%v}\n\n", exit, cancelled)
			fl.Flush()
			return
		}
		fl.Flush()
		select {
		case <-ch:
		case <-tick.C:
			fmt.Fprint(w, ": ping\n\n")
			fl.Flush()
		case <-r.Context().Done():
			return
		}
	}
}

type histEntry struct {
	ID      string    `json:"id"`
	Name    string    `json:"name"`
	Started time.Time `json:"started"`
	Ended   time.Time `json:"ended"`
	Exit    int       `json:"exit"`
	Cancel  bool      `json:"cancelled"`
	Log     string    `json:"log"`
}

func (m *JobManager) persist(j *Job) {
	e := histEntry{j.ID, j.Name, j.Started, j.Ended, j.Exit, j.Cancel, j.Log}
	b, _ := json.Marshal(e)
	f, err := os.OpenFile(filepath.Join(m.app.DataDir, "history.jsonl"), os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return
	}
	defer f.Close()
	_, _ = f.Write(append(b, '\n'))
}

func (m *JobManager) History(n int) []histEntry {
	b, err := os.ReadFile(filepath.Join(m.app.DataDir, "history.jsonl"))
	if err != nil {
		return []histEntry{}
	}
	lines := strings.Split(strings.TrimSpace(string(b)), "\n")
	var out []histEntry
	for i := len(lines) - 1; i >= 0 && len(out) < n; i-- {
		var e histEntry
		if json.Unmarshal([]byte(lines[i]), &e) == nil && e.Log != "" {
			out = append(out, e)
		}
	}
	if out == nil {
		out = []histEntry{}
	}
	return out
}

func findPowerShell() string {
	if runtime.GOOS == "windows" {
		p := filepath.Join(os.Getenv("SystemRoot"), "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
		if _, err := os.Stat(p); err == nil {
			return p
		}
		if p, err := exec.LookPath("powershell.exe"); err == nil {
			return p
		}
		return ""
	}
	if p, err := exec.LookPath("pwsh"); err == nil {
		return p
	}
	if _, err := os.Stat("/opt/pwsh/pwsh"); err == nil {
		return "/opt/pwsh/pwsh"
	}
	return ""
}
