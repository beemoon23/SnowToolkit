//go:build windows

package main

import (
	"encoding/binary"
	"syscall"
	"time"
	"unsafe"
)

var (
	k32                   = syscall.NewLazyDLL("kernel32.dll")
	pGetSystemTimes       = k32.NewProc("GetSystemTimes")
	pGlobalMemoryStatusEx = k32.NewProc("GlobalMemoryStatusEx")
	pGetLogicalDrives     = k32.NewProc("GetLogicalDrives")
	pGetDriveTypeW        = k32.NewProc("GetDriveTypeW")
	pGetDiskFreeSpaceExW  = k32.NewProc("GetDiskFreeSpaceExW")
	pGetTickCount64       = k32.NewProc("GetTickCount64")
	iph                   = syscall.NewLazyDLL("iphlpapi.dll")
	pGetIfTable           = iph.NewProc("GetIfTable")
)

type memStatusEx struct {
	Length               uint32
	MemoryLoad           uint32
	TotalPhys            uint64
	AvailPhys            uint64
	TotalPageFile        uint64
	AvailPageFile        uint64
	TotalVirtual         uint64
	AvailVirtual         uint64
	AvailExtendedVirtual uint64
}

type sampler struct {
	pIdle, pKernel, pUser uint64
	havePrev              bool
	pRx, pTx              uint32
	haveNet               bool
	pTime                 time.Time
}

func newSampler() *sampler { return &sampler{} }

func ft(f syscall.Filetime) uint64 { return uint64(f.HighDateTime)<<32 | uint64(f.LowDateTime) }

func (s *sampler) cpu() float64 {
	var i, k, u syscall.Filetime
	r, _, _ := pGetSystemTimes.Call(uintptr(unsafe.Pointer(&i)), uintptr(unsafe.Pointer(&k)), uintptr(unsafe.Pointer(&u)))
	if r == 0 {
		return 0
	}
	idle, kern, user := ft(i), ft(k), ft(u)
	defer func() { s.pIdle, s.pKernel, s.pUser, s.havePrev = idle, kern, user, true }()
	if !s.havePrev {
		return 0
	}
	dIdle, dKern, dUser := idle-s.pIdle, kern-s.pKernel, user-s.pUser
	total := dKern + dUser // o tempo de kernel inclui o ocioso
	if total == 0 {
		return 0
	}
	v := float64(total-dIdle) / float64(total) * 100
	if v < 0 {
		v = 0
	}
	if v > 100 {
		v = 100
	}
	return v
}

func (s *sampler) net(now time.Time) (rx, tx float64) {
	defer func() { recover() }()
	var size uint32
	pGetIfTable.Call(0, uintptr(unsafe.Pointer(&size)), 0)
	if size == 0 {
		return
	}
	buf := make([]byte, size)
	if r, _, _ := pGetIfTable.Call(uintptr(unsafe.Pointer(&buf[0])), uintptr(unsafe.Pointer(&size)), 0); r != 0 {
		return
	}
	n := int(binary.LittleEndian.Uint32(buf[0:4]))
	const rowSize = 860
	var inO, outO uint32
	for i := 0; i < n; i++ {
		off := 4 + i*rowSize
		if off+rowSize > len(buf) {
			break
		}
		row := buf[off : off+rowSize]
		typ := binary.LittleEndian.Uint32(row[516:520])
		oper := binary.LittleEndian.Uint32(row[544:548])
		if (typ != 6 && typ != 71) || (oper != 4 && oper != 5) {
			continue
		}
		inO += binary.LittleEndian.Uint32(row[552:556])
		outO += binary.LittleEndian.Uint32(row[576:580])
	}
	if s.haveNet {
		dt := now.Sub(s.pTime).Seconds()
		if dt > 0 {
			rx = float64(inO-s.pRx) / dt
			tx = float64(outO-s.pTx) / dt
		}
	}
	s.pRx, s.pTx, s.haveNet, s.pTime = inO, outO, true, now
	return
}

func (s *sampler) sample() (m Metrics) {
	defer func() { recover() }()
	m.CPU = s.cpu()
	var ms memStatusEx
	ms.Length = uint32(unsafe.Sizeof(ms))
	if r, _, _ := pGlobalMemoryStatusEx.Call(uintptr(unsafe.Pointer(&ms))); r != 0 {
		m.MemTotalGB = float64(ms.TotalPhys) / (1 << 30)
		m.MemUsedGB = float64(ms.TotalPhys-ms.AvailPhys) / (1 << 30)
		m.MemPct = float64(ms.MemoryLoad)
	}
	mask, _, _ := pGetLogicalDrives.Call()
	for i := 0; i < 26; i++ {
		if mask&(1<<uint(i)) == 0 {
			continue
		}
		root, _ := syscall.UTF16PtrFromString(string(rune('A'+i)) + `:\`)
		if t, _, _ := pGetDriveTypeW.Call(uintptr(unsafe.Pointer(root))); t != 3 {
			continue
		}
		var avail, total, free uint64
		r, _, _ := pGetDiskFreeSpaceExW.Call(uintptr(unsafe.Pointer(root)), uintptr(unsafe.Pointer(&avail)), uintptr(unsafe.Pointer(&total)), uintptr(unsafe.Pointer(&free)))
		if r != 0 && total > 0 {
			m.Disks = append(m.Disks, DiskM{Letter: string(rune('A' + i)), TotalGB: float64(total) / (1 << 30), FreeGB: float64(free) / (1 << 30)})
		}
	}
	up, _, _ := pGetTickCount64.Call()
	m.UptimeSec = uint64(up) / 1000
	m.RxBps, m.TxBps = s.net(time.Now())
	return
}
