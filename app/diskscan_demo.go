package main

import (
	"fmt"
	"math/rand"
)

// demoScanTree monta uma árvore fictícia (um C: de computador de escritório) para o modo --demo.
func demoScanTree() *dnode {
	rng := rand.New(rand.NewSource(7))
	const MB, GB = int64(1 << 20), int64(1 << 30)
	F := func(name string, size int64) fentry {
		return fentry{name: name, size: size, mtime: 1759000000 + rng.Int63n(20000000), cat: fileCat(name)}
	}
	D := func(name string, kids ...interface{}) *dnode {
		d := &dnode{name: name, mtime: 1759000000 + rng.Int63n(20000000)}
		for _, k := range kids {
			switch v := k.(type) {
			case *dnode:
				d.dirs = append(d.dirs, v)
			case fentry:
				d.files = append(d.files, v)
			case []fentry:
				d.files = append(d.files, v...)
			}
		}
		return d
	}
	// fill cria n arquivos de nomes variados somando ~total bytes
	fill := func(total int64, n int, prefix string, exts ...string) []fentry {
		out := make([]fentry, 0, n)
		var w float64
		ws := make([]float64, n)
		for i := range ws {
			ws[i] = rng.ExpFloat64() + 0.05
			w += ws[i]
		}
		for i := 0; i < n; i++ {
			out = append(out, F(fmt.Sprintf("%s%03d.%s", prefix, i+1, exts[rng.Intn(len(exts))]), int64(float64(total)*ws[i]/w)+1024))
		}
		return out
	}
	user := D("gui",
		D("Downloads", F("Win11_23H2_Portuguese_x64.iso", 5*GB+300*MB), F("ubuntu-24.04-desktop-amd64.iso", 6*GB), F("SnowToolkit-Setup.exe", 13*MB), fill(2*GB+400*MB, 40, "instalador_", "exe", "zip", "msi", "pdf")),
		D("Videos", F("treinamento_equipe_2026.mp4", 3*GB+100*MB), F("reuniao_gravada.mkv", 1*GB+700*MB), fill(4*GB, 25, "gravacao_", "mp4", "mov")),
		D("Documents", D("Relatórios", fill(900*MB, 220, "relatorio_", "xlsx", "pdf", "docx")), D("Contratos", fill(600*MB, 140, "contrato_", "pdf", "docx")), fill(300*MB, 60, "doc_", "docx", "pdf", "txt")),
		D("Pictures", D("Fotos de eventos", fill(3*GB+500*MB, 380, "IMG_", "jpg", "heic", "png")), fill(500*MB, 70, "captura_", "png")),
		D("Desktop", fill(250*MB, 30, "atalho_", "lnk", "pdf", "txt")),
		D("AppData",
			D("Local",
				D("Google", D("Chrome", D("User Data", D("Default", D("Cache", fill(2*GB+200*MB, 600, "f_", "dat")), D("Service Worker", fill(700*MB, 150, "sw_", "dat")), fill(300*MB, 40, "x_", "db"))))),
				D("Microsoft", D("Edge", D("User Data", D("Default", D("Cache", fill(1*GB+300*MB, 500, "e_", "dat"))))), D("OneDrive", fill(900*MB, 60, "od_", "dat", "log")), D("Teams", fill(1*GB+100*MB, 200, "t_", "dll", "dat"))),
				D("Temp", fill(2*GB+600*MB, 800, "tmp", "tmp", "log", "cab")),
				D("Docker", F("ext4.vhdx", 8*GB+200*MB), fill(300*MB, 20, "d_", "json"))),
			D("Roaming", D("Code", fill(1*GB, 300, "c_", "json", "js")), D("Spotify", fill(700*MB, 150, "s_", "file")), D("Discord", fill(500*MB, 120, "dc_", "ldb", "log")))))
	users := D("Users", user, D("Public", fill(200*MB, 30, "p_", "pdf", "jpg")), D("recepcao", D("Documents", fill(1*GB+200*MB, 150, "d_", "docx", "pdf", "xlsx")), D("Downloads", fill(1*GB+600*MB, 60, "dl_", "exe", "pdf", "zip"))))
	win := D("Windows",
		D("WinSxS", fill(9*GB+500*MB, 2600, "amd64_", "dll", "manifest", "mui", "cat")),
		D("System32", D("DriverStore", D("FileRepository", fill(3*GB+200*MB, 900, "drv_", "sys", "dll", "inf", "cat"))), fill(2*GB+900*MB, 1700, "sys_", "dll", "exe", "mui", "sys")),
		D("Installer", fill(3*GB+100*MB, 90, "inst_", "msi", "msp")),
		D("SoftwareDistribution", D("Download", fill(2*GB+300*MB, 180, "wu_", "cab", "psf", "esd"))),
		D("Logs", D("CBS", fill(700*MB, 80, "cbs_", "log", "cab"))),
		D("Temp", fill(500*MB, 120, "t_", "tmp", "log")),
		D("Fonts", fill(450*MB, 400, "font_", "ttf", "otf")),
		fill(1*GB+100*MB, 300, "w_", "dll", "exe", "dat"))
	pf := D("Program Files",
		D("Microsoft Office", fill(4*GB+100*MB, 1800, "off_", "dll", "dat", "exe")),
		D("Docker", D("Docker", fill(2*GB+300*MB, 160, "dk_", "exe", "dll"))),
		D("Google", D("Chrome", fill(700*MB, 90, "gc_", "dll", "pak", "exe"))),
		D("WindowsApps", fill(2*GB+700*MB, 600, "app_", "dll", "exe", "pri")),
		D("Mozilla Firefox", fill(300*MB, 80, "ff_", "dll", "ja")),
		D("7-Zip", fill(5*MB, 8, "z_", "dll", "exe")),
		D("Notepad++", fill(24*MB, 40, "n_", "dll", "xml")))
	pf86 := D("Program Files (x86)", D("Microsoft", D("Edge", fill(1*GB+200*MB, 220, "ed_", "dll", "pak", "exe"))), D("SistemaGestao", fill(1*GB+400*MB, 260, "sg_", "dll", "exe", "mdb", "log")), D("AnyDesk", fill(10*MB, 10, "ad_", "exe", "dll")))
	pd := D("ProgramData", D("Microsoft", D("Windows Defender", fill(1*GB+500*MB, 300, "df_", "vdm", "log", "dat")), D("Windows", D("WER", fill(700*MB, 90, "wer_", "wer", "dmp")))), D("Package Cache", fill(1*GB+100*MB, 180, "pk_", "exe", "msi", "cab")), D("Docker", fill(300*MB, 30, "dd_", "json")))
	root := D(`C:\`, win, users, pf, pf86, pd,
		D("Dados", D("Backup", F("backup_servidor_set.zip", 7*GB), F("backup_servidor_ago.zip", 6*GB+400*MB), fill(1*GB, 12, "bk_", "7z", "zip")), D("Compartilhado", fill(2*GB+300*MB, 400, "comp_", "xlsx", "pdf", "docx", "jpg"))),
		F("pagefile.sys", 6*GB), F("hiberfil.sys", 5*GB+100*MB), F("swapfile.sys", 256*MB))
	root.denied = false
	// uma pasta protegida, como no Windows de verdade
	root.dirs = append(root.dirs, &dnode{name: "System Volume Information", denied: true})
	// arquivos pequenos não guardados individualmente
	user.dirs[0].otherBytes, user.dirs[0].otherCount = 180*MB, 2300
	user.dirs[0].cat[catOutros] = 180 * MB
	return root
}
