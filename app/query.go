package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

var queryTimeout = map[string]time.Duration{
	"bigfolders": 15 * time.Minute, "updates": 6 * time.Minute, "netscan": 2 * time.Minute,
	"winget_upgrades": 4 * time.Minute, "winget_search": 3 * time.Minute, "events": 3 * time.Minute,
	"failed_logins": 3 * time.Minute, "remote_info": 90 * time.Second, "reboots": 3 * time.Minute, "bsod": 2 * time.Minute,
}

// runQuery executa ps/q_<id>.ps1 e devolve o JSON impresso no stdout.
func (a *App) runQuery(ctx context.Context, id string, params map[string]string) ([]byte, error) {
	src, err := psFS.ReadFile("ps/q_" + id + ".ps1")
	if err != nil {
		return nil, errors.New("consulta desconhecida: " + id)
	}
	ps := findPowerShell()
	if a.Demo || ps == "" {
		time.Sleep(250 * time.Millisecond)
		return demoQuery(id, params), nil
	}
	select {
	case a.querySem <- struct{}{}:
		defer func() { <-a.querySem }()
	case <-ctx.Done():
		return nil, ctx.Err()
	}
	timeout := 2 * time.Minute
	if t, ok := queryTimeout[id]; ok {
		timeout = t
	}
	cctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	prelude, _ := psFS.ReadFile("ps/_prelude.ps1")
	full := "\xef\xbb\xbf" + string(prelude) + "\n" + string(src)
	tmp := filepath.Join(a.DataDir, "tmp", fmt.Sprintf("q_%s_%d.ps1", id, time.Now().UnixNano()))
	if err := os.WriteFile(tmp, []byte(full), 0o600); err != nil {
		return nil, err
	}
	defer os.Remove(tmp)

	args := []string{"-NoProfile", "-NonInteractive"}
	if runtime.GOOS == "windows" {
		args = append(args, "-ExecutionPolicy", "Bypass")
	}
	args = append(args, "-File", tmp)
	cmd := exec.CommandContext(cctx, ps, args...)
	cmd.Env = append(os.Environ(), paramsToEnv(params)...)
	hideWindow(cmd)
	var so, se bytes.Buffer
	cmd.Stdout, cmd.Stderr = &so, &se
	runErr := cmd.Run()
	out := bytes.TrimSpace(bytes.TrimPrefix(bytes.TrimSpace(so.Bytes()), []byte("\xef\xbb\xbf")))
	// o JSON e a ultima linha que comeca com { ou [ (ignora ruido eventual antes dele)
	if i := bytes.LastIndexByte(out, '\n'); i >= 0 {
		last := bytes.TrimSpace(out[i+1:])
		if len(last) > 0 && (last[0] == '{' || last[0] == '[') {
			out = last
		}
	}
	if json.Valid(out) && len(out) > 0 {
		return out, nil
	}
	if cctx.Err() == context.DeadlineExceeded {
		return nil, errors.New("tempo esgotado ao consultar o sistema")
	}
	msg := strings.TrimSpace(se.String())
	if msg == "" && runErr != nil {
		msg = runErr.Error()
	}
	if msg == "" {
		msg = "o PowerShell não devolveu dados"
	}
	if len(msg) > 600 {
		msg = msg[:600] + "..."
	}
	return nil, errors.New(msg)
}
