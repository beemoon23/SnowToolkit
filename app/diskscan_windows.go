//go:build windows

package main

import (
	"os"
	"syscall"
)

const (
	attrReparse          = 0x400
	attrOffline          = 0x1000
	attrRecallOpen       = 0x40000
	attrRecallOnData     = 0x400000
	attrCloudPlaceholder = attrOffline | attrRecallOpen | attrRecallOnData
)

func winAttrs(info os.FileInfo) uint32 {
	if d, ok := info.Sys().(*syscall.Win32FileAttributeData); ok {
		return d.FileAttributes
	}
	return 0
}

// isReparseDir: pasta que é junction, link simbólico ou ponto de montagem (não deve ser seguida).
func isReparseDir(info os.FileInfo) bool { return winAttrs(info)&attrReparse != 0 }

// isOffline: arquivo que existe só na nuvem (OneDrive etc.) e não ocupa espaço local.
func isOffline(info os.FileInfo) bool { return winAttrs(info)&attrCloudPlaceholder != 0 }
