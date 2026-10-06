//go:build !windows

package main

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
)

func fatal(msg string) {
	fmt.Fprintln(os.Stderr, msg)
	os.Exit(1)
}

func isAdmin() bool { return os.Geteuid() == 0 }

// Fora do Windows (uso para testes): abre o navegador padrao quando possivel.
func openWindow(url, dataDir string, onClose func()) {
	fmt.Println("Abra no navegador:", url)
	switch runtime.GOOS {
	case "darwin":
		_ = exec.Command("open", url).Start()
	case "linux":
		_ = exec.Command("xdg-open", url).Start()
	}
}
