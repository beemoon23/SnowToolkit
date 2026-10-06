//go:build !windows

package main

import "os"

func isReparseDir(info os.FileInfo) bool { return info.Mode()&os.ModeSymlink != 0 }
func isOffline(info os.FileInfo) bool    { return false }
