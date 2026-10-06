package main

import (
	"sync"
	"time"
)

type DiskM struct {
	Letter  string  `json:"letter"`
	TotalGB float64 `json:"totalGB"`
	FreeGB  float64 `json:"freeGB"`
}

type Metrics struct {
	CPU        float64 `json:"cpu"`
	MemPct     float64 `json:"memPct"`
	MemTotalGB float64 `json:"memTotalGB"`
	MemUsedGB  float64 `json:"memUsedGB"`
	Disks      []DiskM `json:"disks"`
	UptimeSec  uint64  `json:"uptimeSec"`
	RxBps      float64 `json:"rxBps"`
	TxBps      float64 `json:"txBps"`
	Time       int64   `json:"time"`
}

var (
	metricsMu  sync.RWMutex
	metricsNow Metrics
)

func currentMetrics() Metrics {
	metricsMu.RLock()
	defer metricsMu.RUnlock()
	return metricsNow
}

func startMetrics() {
	s := newSampler()
	t := time.NewTicker(time.Second)
	defer t.Stop()
	for {
		m := s.sample()
		m.Time = time.Now().UnixMilli()
		metricsMu.Lock()
		metricsNow = m
		metricsMu.Unlock()
		<-t.C
	}
}
