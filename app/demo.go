package main

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"
)

type M = map[string]any

func jb(v any) []byte { b, _ := json.Marshal(v); return b }

func rows(n int, f func(i int) M) []M {
	out := make([]M, n)
	for i := range out {
		out[i] = f(i)
	}
	return out
}

func pick(list []string, i int) string { return list[i%len(list)] }

var demoProcNames = []string{"chrome", "msedge", "Code", "explorer", "svchost", "Teams", "OUTLOOK", "node", "docker", "MsMpEng", "dwm", "Discord", "Spotify", "SearchHost", "RuntimeBroker", "WmiPrvSE", "csrss", "lsass", "ctfmon", "powershell"}

// demoQuery devolve dados ficticios para testar a interface sem Windows.
func demoQuery(id string, p map[string]string) []byte {
	switch id {
	case "sysinfo":
		return jb(M{"host": "PC-TI-01", "user": "EMPRESA\\gui", "domain": "WORKGROUP", "partOfDomain": false, "maker": "Dell Inc.", "model": "OptiPlex 7090", "serial": "7XK29Q3",
			"biosVersion": "1.18.0", "biosDate": "14/03/2024", "board": "Dell Inc. 0M3H2V", "os": "Microsoft Windows 11 Pro", "build": "26100", "arch": "64 bits", "installDate": "02/06/2025",
			"uptime": "3d 5h 12min", "uptimeDays": 3.2, "cpu": "Intel(R) Core(TM) i5-11500 @ 2.70GHz", "cores": 6, "threads": 12, "ramGB": 15.8,
			"ram": []M{{"slot": "DIMM A", "gb": 8, "mhz": 3200, "maker": "Kingston", "part": "KF3200C16D4/8GX"}, {"slot": "DIMM B", "gb": 8, "mhz": 3200, "maker": "Kingston", "part": "KF3200C16D4/8GX"}},
			"gpu": []string{"Intel(R) UHD Graphics 750 (driver 31.0.101.4502)"}, "activation": "Ativado", "secureBoot": "Ativado", "tpm": "Presente e pronto",
			"net": []M{{"nic": "Ethernet", "ip": "10.0.0.41", "gw": "10.0.0.1"}}})
	case "health":
		return jb(M{"pendingReboot": true, "pendingReasons": []string{"Windows Update"}, "defender": M{"enabled": true, "realtime": true, "sigAgeDays": 2, "lastQuick": "29/09/2026 08:14"},
			"firewall": []M{{"name": "Domain", "enabled": true}, {"name": "Private", "enabled": true}, {"name": "Public", "enabled": false}}, "lastUpdateDays": 47,
			"disks":   []M{{"name": "Samsung SSD 980 500GB", "health": "Healthy"}, {"name": "WDC WD10EZEX", "health": "Healthy"}},
			"volumes": []M{{"letter": "C", "freePct": 18, "freeGB": 88.4}, {"letter": "D", "freePct": 65, "freeGB": 602.9}}, "failedServices": []string{"gupdate"}, "smb1": true, "rdp": false,
			"bitlocker": []M{{"mount": "C:", "status": "Off"}}, "admins": 3, "uptimeDays": 3.2})
	case "disks":
		return jb(M{"volumes": []M{{"letter": "C", "label": "Windows", "fs": "NTFS", "type": "Fixed", "sizeGB": 476.3, "freeGB": 88.4, "health": "Healthy"}, {"letter": "D", "label": "Dados", "fs": "NTFS", "type": "Fixed", "sizeGB": 931.5, "freeGB": 602.9, "health": "Healthy"}},
			"physical": []M{{"name": "Samsung SSD 980 500GB", "media": "SSD", "bus": "NVMe", "sizeGB": 466, "health": "Healthy", "status": "OK", "temp": 41, "wear": 4, "hours": 5120, "readErr": 0, "writeErr": 0},
				{"name": "WDC WD10EZEX-08WN4A0", "media": "HDD", "bus": "SATA", "sizeGB": 932, "health": "Healthy", "status": "OK", "temp": 36, "wear": nil, "hours": 21870, "readErr": 0, "writeErr": 0}}})
	case "processes":
		return jb(rows(48, func(i int) M {
			return M{"pid": 400 + i*37, "name": pick(demoProcNames, i), "cpu": float64((i*7919)%9000) / 10, "memMB": float64(30 + (i*263)%1400), "threads": 4 + i%40,
				"path": "C:\\Program Files\\" + pick(demoProcNames, i) + "\\" + pick(demoProcNames, i) + ".exe", "title": map[bool]string{true: "Janela " + pick(demoProcNames, i), false: ""}[i%3 == 0]}
		}))
	case "services":
		names := []string{"Spooler", "wuauserv", "BITS", "Dnscache", "W32Time", "WinRM", "Winmgmt", "EventLog", "LanmanServer", "Schedule", "Themes", "AudioSrv", "gupdate", "DiagTrack", "SysMain", "WSearch", "RpcSs", "Dhcp", "mpssvc", "WinDefend"}
		return jb(rows(len(names), func(i int) M {
			st := "Running"
			if i == 12 || i == 14 {
				st = "Stopped"
			}
			return M{"name": names[i], "display": "Serviço " + names[i], "state": st, "start": pick([]string{"Auto", "Manual", "Auto", "Disabled"}, i), "account": "LocalSystem", "pid": 1000 + i*13, "path": "C:\\Windows\\System32\\svchost.exe -k netsvcs"}
		}))
	case "startup":
		return jb([]M{{"name": "SecurityHealth", "command": "%windir%\\system32\\SecurityHealthSystray.exe", "location": "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run", "user": "Public"},
			{"name": "Discord", "command": "C:\\Users\\gui\\AppData\\Local\\Discord\\Update.exe --processStart Discord.exe", "location": "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run", "user": "EMPRESA\\gui"},
			{"name": "RustDesk", "command": "\"C:\\Program Files\\RustDesk\\rustdesk.exe\" --tray", "location": "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run", "user": "Public"}})
	case "tasks":
		return jb([]M{{"name": "Backup diário", "path": "\\", "state": "Ready", "author": "EMPRESA\\gui", "command": "robocopy D:\\Dados E:\\Backup /MIR"}, {"name": "Monitor de rede", "path": "\\", "state": "Running", "author": "EMPRESA\\gui", "command": "node C:\\netwatch\\server.js"}, {"name": "GoogleUpdateTaskMachineCore", "path": "\\", "state": "Ready", "author": "Google LLC", "command": "C:\\Program Files (x86)\\Google\\Update\\GoogleUpdate.exe /c"}})
	case "programs":
		names := []string{"Google Chrome", "7-Zip", "VLC media player", "Notepad++", "Visual Studio Code", "Git", "Node.js", "Python 3.12", "Docker Desktop", "Discord", "Steam", "OBS Studio", "WinRAR", "AnyDesk", "Adobe Acrobat Reader", "Java 8 Update 301", "Microsoft Visual C++ 2015-2022 Redistributable (x64)", "Mozilla Firefox", "Tailscale", "RustDesk"}
		return jb(rows(len(names), func(i int) M {
			return M{"name": names[i], "version": fmt.Sprintf("%d.%d.%d", 1+i%20, i%9, i*3%100), "publisher": pick([]string{"Google LLC", "Igor Pavlov", "VideoLAN", "Microsoft", "Valve"}, i), "date": fmt.Sprintf("2026%02d%02d", 1+i%9, 1+i%27), "sizeMB": float64(20 + i*37%900), "uninstall": "MsiExec.exe /I{DEMO-" + fmt.Sprint(i) + "}", "quiet": nil}
		}))
	case "appx":
		names := []string{"Microsoft.BingNews", "Microsoft.BingWeather", "Microsoft.GetHelp", "Microsoft.MicrosoftSolitaireCollection", "Microsoft.YourPhone", "Microsoft.ZuneMusic", "Clipchamp.Clipchamp", "Microsoft.Todos", "Microsoft.WindowsMaps", "Microsoft.PowerAutomateDesktop", "MicrosoftTeams", "Microsoft.Copilot"}
		return jb(rows(len(names), func(i int) M {
			return M{"name": names[i], "version": fmt.Sprintf("1.%d.0.0", i*3), "publisher": "Microsoft Corporation", "full": names[i] + "_1." + fmt.Sprint(i*3) + ".0.0_x64__8wekyb3d8bbwe"}
		}))
	case "winget_upgrades":
		return jb(M{"ok": true, "lines": []string{
			"Name                       Id                        Version      Available    Source",
			"Google Chrome              Google.Chrome             128.0.6613   129.0.6668   winget",
			"Visual Studio Code         Microsoft.VisualStudioCode 1.93.1      1.94.0       winget",
			"7-Zip                      7zip.7zip                 23.01        24.08        winget",
			"Node.js LTS                OpenJS.NodeJS.LTS         20.17.0      20.18.0      winget",
			"Discord                    Discord.Discord           1.0.9163     1.0.9164     winget",
			"5 upgrades available."}})
	case "winget_search":
		q := p["Q"]
		return jb(M{"ok": true, "lines": []string{"Name              Id                      Version   Source", "Resultado 1 " + q + "   Demo.App1   1.0.0     winget", "Resultado 2 " + q + "   Demo.App2   2.3.1     winget"}})
	case "nics":
		return jb([]M{{"name": "Ethernet", "desc": "Intel(R) Ethernet Connection I219-LM", "status": "Up", "speed": "1 Gbps", "mac": "A4-BB-6D-12-34-56", "media": "802.3", "ip": "10.0.0.41", "gw": "10.0.0.1", "dns": "10.0.0.1, 1.1.1.1", "dhcp": "Enabled", "index": 4},
			{"name": "Wi-Fi", "desc": "Intel(R) Wi-Fi 6 AX201", "status": "Disconnected", "speed": "0 bps", "mac": "A4-BB-6D-12-34-57", "media": "Native 802.11", "ip": "", "gw": "", "dns": "", "dhcp": "Enabled", "index": 7},
			{"name": "Tailscale", "desc": "Tailscale Tunnel", "status": "Up", "speed": "100 Gbps", "mac": "", "media": "Unspecified", "ip": "100.88.12.4", "gw": "", "dns": "100.100.100.100", "dhcp": "Disabled", "index": 11}})
	case "connections":
		return jb(rows(26, func(i int) M {
			return M{"proc": pick(demoProcNames, i), "pid": 800 + i*11, "local": "10.0.0.41", "lport": 49000 + i*13, "remote": fmt.Sprintf("142.250.%d.%d", 70+i%9, 10+i*7%200), "rport": pick([]string{"443", "443", "80", "8088"}, i), "state": "Established"}
		}))
	case "wifi":
		return jb([]M{{"name": "Empresa-Staff", "password": "demo-senha-123", "auth": "WPA2-Personal"}, {"name": "Empresa-Visitantes", "password": "demo-visitante-123", "auth": "WPA2-Personal"}, {"name": "CafeDoCentro", "password": nil, "auth": "Open"}})
	case "users":
		return jb([]M{{"name": "gui", "fullName": "Guilherme", "enabled": true, "admin": true, "lastLogon": "30/09/2026 08:02", "pwdExpires": "nunca", "pwdRequired": true, "desc": ""},
			{"name": "Administrador", "fullName": "", "enabled": false, "admin": true, "lastLogon": "", "pwdExpires": "nunca", "pwdRequired": true, "desc": "Conta interna para administração"},
			{"name": "recepcao", "fullName": "Recepção", "enabled": true, "admin": false, "lastLogon": "29/09/2026 17:40", "pwdExpires": "28/12/2026", "pwdRequired": true, "desc": ""}})
	case "shares":
		return jb(M{"shares": []M{{"name": "ADMIN$", "path": "C:\\Windows", "desc": "Admin remota", "special": true}, {"name": "C$", "path": "C:\\", "desc": "Padrão", "special": true}, {"name": "Compartilhado", "path": "D:\\Compartilhado", "desc": "Arquivos da equipe", "special": false}},
			"sessions": []M{{"client": "10.0.0.77", "user": "EMPRESA\\maria", "opens": 3, "secs": 1240}}, "open": []M{{"client": "10.0.0.77", "user": "EMPRESA\\maria", "path": "D:\\Compartilhado\\planilha.xlsx"}}})
	case "printers":
		return jb([]M{{"name": "Recepção HP LaserJet", "driver": "HP Universal Printing PCL 6", "port": "IP_10.0.0.80", "status": "Normal", "shared": false, "jobs": 0}, {"name": "Financeiro Brother", "driver": "Brother HL-L2360D", "port": "IP_10.0.0.81", "status": "Normal", "shared": true, "jobs": 2}, {"name": "Microsoft Print to PDF", "driver": "Microsoft Print To PDF", "port": "PORTPROMPT:", "status": "Normal", "shared": false, "jobs": 0}})
	case "defender":
		return jb(M{"status": M{"enabled": true, "realtime": true, "behavior": true, "sigVersion": "1.421.1234.0", "sigAge": 2, "sigUpdated": "28/09/2026 06:30", "lastQuick": "29/09/2026 08:14", "lastFull": "12/09/2026 02:00"}, "threats": []M{}, "firewall": []M{{"name": "Domain", "enabled": true, "inbound": "Block"}, {"name": "Private", "enabled": true, "inbound": "Block"}, {"name": "Public", "enabled": false, "inbound": "Block"}}})
	case "firewall_rules":
		return jb([]M{{"name": "Porta 8088", "id": "{DEMO-1}", "proto": "TCP", "port": "8088", "profile": "Any"}, {"name": "RustDesk", "id": "{DEMO-2}", "proto": "TCP", "port": "21115-21119", "profile": "Any"}})
	case "bitlocker":
		return jb(M{"volumes": []M{{"mount": "C:", "status": "FullyDecrypted", "protection": "Off", "pct": 0, "method": "None"}}, "tpm": M{"present": true, "ready": true, "enabled": true, "version": "7.2.3.1"}})
	case "events":
		return jb(rows(36, func(i int) M {
			return M{"time": fmt.Sprintf("30/09/2026 %02d:%02d:1%d", 21-i/6, 59-i*3%60, i%10), "id": pick([]string{"7023", "10016", "1000", "41", "7000", "55"}, i), "level": pick([]string{"Erro", "Crítico", "Erro", "Aviso"}, i), "provider": pick([]string{"Service Control Manager", "DistributedCOM", "Application Error", "Microsoft-Windows-Kernel-Power", "Ntfs"}, i), "message": "Mensagem de exemplo do evento. O serviço terminou de forma inesperada ou o aplicativo parou de responder."}
		}))
	case "failed_logins":
		ips := []string{"185.220.101.4", "45.134.26.88", "10.0.0.77", "103.74.19.2"}
		return jb(rows(34, func(i int) M {
			return M{"time": fmt.Sprintf("30/09/2026 %02d:%02d:07", 3+i/4, i*7%60), "user": pick([]string{"administrator", "admin", "gui", "recepcao", "test"}, i), "domain": "PC-TI-01", "logonType": pick([]string{"3", "10", "2"}, i), "workstation": pick([]string{"-", "KALI", "DESKTOP-9F2K1"}, i), "ip": pick(ips, i)}
		}))
	case "reboots":
		return jb([]M{{"time": "27/09/2026 07:58:01", "id": 6005, "kind": "Serviço de log iniciado (boot)", "message": "O serviço de Log de eventos foi iniciado."}, {"time": "27/09/2026 07:57:40", "id": 1074, "kind": "Desligamento/reinício solicitado", "message": "Processo: TrustedInstaller.exe | Motivo: Outro (Planejado) | Ação: restart | Usuário: NT AUTHORITY\\SYSTEM"}, {"time": "21/09/2026 15:12:09", "id": 41, "kind": "Reinício inesperado (Kernel-Power)", "message": "O sistema foi reiniciado sem desligar corretamente antes."}})
	case "bsod":
		return jb(M{"events": []M{{"time": "21/09/2026 15:12:30", "message": "O computador foi reiniciado após uma verificação de bugs. 0x000000d1"}}, "dumps": []M{{"name": "092126-8421-01.dmp", "kb": 287, "time": "21/09/2026 15:12"}}, "full": nil})
	case "hotfix":
		return jb(rows(14, func(i int) M {
			return M{"id": fmt.Sprintf("KB50%05d", 31000+i*173), "desc": pick([]string{"Update", "Security Update", "Hotfix"}, i), "date": fmt.Sprintf("%02d/%02d/2026", 1+i%27, 9-i%8), "by": "NT AUTHORITY\\SYSTEM"}
		}))
	case "updates":
		return jb(M{"ok": true, "updates": []M{{"title": "2026-09 Atualização Cumulativa do Windows 11 (KB5043080)", "kb": "5043080", "sizeMB": 812.4, "mandatory": false, "driver": false, "cats": "Atualizações de Segurança"},
			{"title": "Intel - Net - 22.250.1.2", "kb": "", "sizeMB": 14.2, "mandatory": false, "driver": true, "cats": "Drivers"}}})
	case "bigfolders":
		root := p["PATH"]
		if root == "" {
			root = "C:\\"
		}
		names := []string{"Users", "Windows", "Program Files", "Program Files (x86)", "ProgramData", "node_modules-cache", "pagefile.sys", "hiberfil.sys", "Docker", "Temp"}
		return jb(M{"ok": true, "root": root, "items": rows(len(names), func(i int) M {
			return M{"name": names[i], "path": root + names[i], "bytes": float64(60-i*5) * 1.07e9, "dir": i != 6 && i != 7}
		})})
	case "netscan":
		base := p["BASE"]
		if base == "" {
			base = "10.0.0"
		}
		nm := []string{"gateway.local", "servidor-chamados", "servidor-bot", "impressora-recepcao", "ap-recepcao", "pc-financeiro", "camera-01", ""}
		return jb(M{"ok": true, "hosts": rows(len(nm), func(i int) M {
			return M{"ip": fmt.Sprintf("%s.%d", base, 1+i*13), "name": nm[i], "mac": fmt.Sprintf("A4-BB-6D-%02X-%02X-%02X", i*17%255, i*31%255, i*7%255), "ms": 1 + i%4, "ports": pick([]string{"80, 443", "22", "", "445, 3389", "9100"}, i)}
		})})
	case "publicip":
		return jb(M{"ok": true, "ip": "177.82.14.201", "city": "Mogi das Cruzes", "region": "São Paulo", "org": "AS28573 Claro S.A.", "country": "BR"})
	case "remote_info":
		return jb(M{"ok": true, "info": M{"host": strings.ToUpper(p["HOST"]), "user": "", "os": "Microsoft Windows 10 Pro", "build": "19045", "model": "OptiPlex 3080", "ramGB": 7.8, "freeGB": 212.3, "uptime": "12d 3h 8min", "ips": "10.0.0.77"}})
	}
	return jb([]any{})
}

var reStep = regexp.MustCompile(`(?m)(?:Invoke-Step|\bStep)\s+\(?['"]([^'"]+)['"]`)

func (m *JobManager) demoRun(j *Job, script string) {
	j.add(Line{K: "i", T: "[modo demonstração] nada é executado de verdade."})
	steps := reStep.FindAllStringSubmatch(script, 40)
	if len(steps) == 0 {
		j.add(Line{K: "o", T: ">> executando script"})
		time.Sleep(300 * time.Millisecond)
		j.add(Line{K: "o", T: "[OK] concluído"})
		return
	}
	for i, s := range steps {
		if j.Cancel {
			return
		}
		j.add(Line{K: "o", T: ">> " + s[1]})
		if i == 0 {
			for p := 10; p <= 100; p += 30 {
				j.add(Line{K: "o", T: fmt.Sprintf("[=====%s%d.0%%]", strings.Repeat("=", p/10), p), R: true})
				time.Sleep(120 * time.Millisecond)
			}
		}
		time.Sleep(220 * time.Millisecond)
		j.add(Line{K: "o", T: "[OK] concluído"})
	}
}
