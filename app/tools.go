package main

import (
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

var launchList = map[string][]string{
	"msinfo32": {"msinfo32"}, "devmgmt": {"devmgmt.msc"}, "diskmgmt": {"diskmgmt.msc"}, "services": {"services.msc"},
	"eventvwr": {"eventvwr.msc"}, "compmgmt": {"compmgmt.msc"}, "taskschd": {"taskschd.msc"}, "gpedit": {"gpedit.msc"},
	"lusrmgr": {"lusrmgr.msc"}, "resmon": {"resmon"}, "perfmon": {"perfmon"}, "ncpa": {"ncpa.cpl"}, "appwiz": {"appwiz.cpl"},
	"netplwiz": {"netplwiz"}, "mstsc": {"mstsc"}, "regedit": {"regedit"}, "taskmgr": {"taskmgr"}, "cmd": {"cmd.exe"},
	"powershell": {"powershell.exe"}, "control": {"control"}, "firewall": {"firewall.cpl"}, "sysdm": {"sysdm.cpl"},
	"powercfg": {"powercfg.cpl"}, "certmgr": {"certmgr.msc"}, "dfrgui": {"dfrgui"}, "cleanmgr": {"cleanmgr"},
	"msconfig": {"msconfig"}, "rstrui": {"rstrui.exe"}, "winver": {"winver"}, "secpol": {"secpol.msc"}, "wf": {"wf.msc"}, "printmgmt": {"printmanagement.msc"},
	"devices": {"ms-settings:"}, "wu": {"ms-settings:windowsupdate"}, "ncsi": {"ms-settings:network-status"},
}

func (a *App) handleLaunch(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ID string `json:"id"`
	}
	if err := readJSON(r, &req); err != nil {
		writeJSON(w, 400, map[string]any{"error": "requisição inválida"})
		return
	}
	target, ok := launchList[req.ID]
	if !ok {
		writeJSON(w, 404, map[string]any{"error": "ferramenta desconhecida"})
		return
	}
	if a.Demo || !isWindows() {
		writeJSON(w, 200, map[string]any{"ok": true, "demo": true})
		return
	}
	cmd := exec.Command("cmd.exe", append([]string{"/c", "start", ""}, target...)...)
	hideWindow(cmd)
	if err := cmd.Start(); err != nil {
		writeJSON(w, 500, map[string]any{"error": err.Error()})
		return
	}
	go cmd.Wait()
	writeJSON(w, 200, map[string]any{"ok": true})
}

func desktopDir() string {
	home := os.Getenv("USERPROFILE")
	if home == "" {
		home, _ = os.UserHomeDir()
	}
	cands := []string{filepath.Join(home, "Desktop"), filepath.Join(home, "OneDrive", "Desktop"), filepath.Join(home, "Área de Trabalho"), home}
	for _, c := range cands {
		if st, err := os.Stat(c); err == nil && st.IsDir() {
			return c
		}
	}
	return os.TempDir()
}

var reFile = regexp.MustCompile(`[^A-Za-z0-9_\-. ]+`)

func (a *App) handleSave(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name    string `json:"name"`
		Content string `json:"content"`
	}
	if err := readJSON(r, &req); err != nil || req.Content == "" {
		writeJSON(w, 400, map[string]any{"error": "conteúdo vazio"})
		return
	}
	name := reFile.ReplaceAllString(filepath.Base(req.Name), "_")
	if name == "" || name == "." {
		name = "SnowScript.ps1"
	}
	path := filepath.Join(desktopDir(), name)
	data := []byte(req.Content)
	if strings.HasSuffix(strings.ToLower(name), ".ps1") {
		data = append([]byte("\xef\xbb\xbf"), data...)
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		writeJSON(w, 500, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, 200, map[string]any{"ok": true, "path": path})
}

// handleOpen revela no Explorer apenas arquivos da area de trabalho ou da pasta de logs do programa.
func (a *App) handleOpen(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Path string `json:"path"`
		Logs string `json:"log"`
	}
	if err := readJSON(r, &req); err != nil {
		writeJSON(w, 400, map[string]any{"error": "requisição inválida"})
		return
	}
	target := req.Path
	if req.Logs != "" {
		target = filepath.Join(a.DataDir, "logs", filepath.Base(req.Logs))
	}
	if req.Path == "@logs" {
		target = filepath.Join(a.DataDir, "logs")
	}
	abs, _ := filepath.Abs(target)
	okDir := strings.HasPrefix(strings.ToLower(abs), strings.ToLower(a.DataDir)) || strings.HasPrefix(strings.ToLower(abs), strings.ToLower(desktopDir()))
	if !okDir {
		writeJSON(w, 403, map[string]any{"error": "caminho não permitido"})
		return
	}
	if a.Demo || !isWindows() {
		writeJSON(w, 200, map[string]any{"ok": true, "demo": true})
		return
	}
	var cmd *exec.Cmd
	if st, err := os.Stat(abs); err == nil && st.IsDir() {
		cmd = exec.Command("explorer.exe", abs)
	} else {
		cmd = exec.Command("explorer.exe", "/select,"+abs)
	}
	_ = cmd.Start()
	go cmd.Wait()
	writeJSON(w, 200, map[string]any{"ok": true})
}

// ---- Wake-on-LAN ----
var reMAC = regexp.MustCompile(`^([0-9A-Fa-f]{2}[:\-]?){5}[0-9A-Fa-f]{2}$`)

func (a *App) handleWOL(w http.ResponseWriter, r *http.Request) {
	var req struct {
		MAC string `json:"mac"`
	}
	if err := readJSON(r, &req); err != nil || !reMAC.MatchString(strings.TrimSpace(req.MAC)) {
		writeJSON(w, 400, map[string]any{"error": "MAC inválido (use AA:BB:CC:DD:EE:FF)"})
		return
	}
	hex := strings.NewReplacer(":", "", "-", "").Replace(strings.TrimSpace(req.MAC))
	mac := make([]byte, 6)
	for i := 0; i < 6; i++ {
		v, _ := strconv.ParseUint(hex[i*2:i*2+2], 16, 8)
		mac[i] = byte(v)
	}
	pkt := make([]byte, 0, 102)
	for i := 0; i < 6; i++ {
		pkt = append(pkt, 0xFF)
	}
	for i := 0; i < 16; i++ {
		pkt = append(pkt, mac...)
	}
	targets := map[string]bool{"255.255.255.255": true}
	if ifs, err := net.Interfaces(); err == nil {
		for _, ifc := range ifs {
			if ifc.Flags&net.FlagUp == 0 || ifc.Flags&net.FlagLoopback != 0 {
				continue
			}
			addrs, _ := ifc.Addrs()
			for _, ad := range addrs {
				if ipn, ok := ad.(*net.IPNet); ok && ipn.IP.To4() != nil {
					ip := ipn.IP.To4()
					m := ipn.Mask
					if len(m) == 16 {
						m = m[12:]
					}
					b := make(net.IP, 4)
					for i := 0; i < 4; i++ {
						b[i] = ip[i] | ^m[i]
					}
					targets[b.String()] = true
				}
			}
		}
	}
	sent := 0
	if !a.Demo {
		for t := range targets {
			c, err := net.Dial("udp4", t+":9")
			if err != nil {
				continue
			}
			if _, err := c.Write(pkt); err == nil {
				sent++
			}
			c.Close()
		}
	} else {
		sent = len(targets)
	}
	writeJSON(w, 200, map[string]any{"ok": sent > 0, "sent": sent})
}

// ---- Monitor de ping ----
var reHost = regexp.MustCompile(`^[A-Za-z0-9._\-]{1,253}$`)
var reMS = regexp.MustCompile(`(?i)(?:=|<)\s*(\d+)\s*ms`)

type pingRes struct {
	Host string  `json:"host"`
	Up   bool    `json:"up"`
	MS   float64 `json:"ms"`
}

func (a *App) handlePingMon(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Hosts []string `json:"hosts"`
	}
	if err := readJSON(r, &req); err != nil || len(req.Hosts) == 0 || len(req.Hosts) > 80 {
		writeJSON(w, 400, map[string]any{"error": "lista de hosts inválida"})
		return
	}
	res := make([]pingRes, len(req.Hosts))
	var wg sync.WaitGroup
	sem := make(chan struct{}, 24)
	for i, h := range req.Hosts {
		res[i] = pingRes{Host: h}
		if !reHost.MatchString(h) {
			continue
		}
		wg.Add(1)
		go func(i int, h string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			if a.Demo || !isWindows() {
				res[i].Up = (len(h)+i)%5 != 0
				res[i].MS = float64(1 + (len(h)*7+i*3)%40)
				time.Sleep(60 * time.Millisecond)
				return
			}
			cmd := exec.Command("ping", "-n", "1", "-w", "900", h)
			hideWindow(cmd)
			out, _ := cmd.CombinedOutput()
			s := string(out)
			if strings.Contains(strings.ToLower(s), "ttl=") {
				res[i].Up = true
				if m := reMS.FindStringSubmatch(s); m != nil {
					v, _ := strconv.ParseFloat(m[1], 64)
					res[i].MS = v
				}
			}
		}(i, h)
	}
	wg.Wait()
	writeJSON(w, 200, res)
}

func isWindows() bool { return filepath.Separator == '\\' }

var _ = fmt.Sprint
