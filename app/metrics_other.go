//go:build !windows

package main

import (
	"math"
	"time"
)

type sampler struct{ t0 time.Time }

func newSampler() *sampler { return &sampler{t0: time.Now()} }

// valores ficticios (so para desenvolvimento e modo demo fora do Windows)
func (s *sampler) sample() Metrics {
	t := time.Since(s.t0).Seconds()
	cpu := 22 + 14*math.Sin(t/5) + 6*math.Sin(t/1.7)
	return Metrics{
		CPU: cpu, MemPct: 58 + 4*math.Sin(t/11), MemTotalGB: 15.8, MemUsedGB: 15.8 * (58 + 4*math.Sin(t/11)) / 100,
		Disks:     []DiskM{{"C", 476.3, 88.4}, {"D", 931.5, 602.9}},
		UptimeSec: uint64(3*86400 + 5*3600 + int(t)), RxBps: 220000 + 180000*math.Abs(math.Sin(t/3)), TxBps: 40000 + 30000*math.Abs(math.Sin(t/4)),
	}
}
