package collector

import (
	"context"
	"fmt"
	"time"
	"github.com/shirou/gopsutil/v3/process"
)

type ProcessCollector struct{}
func NewProcessCollector() *ProcessCollector { return &ProcessCollector{} }
func (p *ProcessCollector) Name() string      { return "processes" }

func (p *ProcessCollector) Collect(ctx context.Context) ([]MetricPoint, error) {
	now    := time.Now()
	procs, err := process.ProcessesWithContext(ctx)
	if err != nil { return nil, fmt.Errorf("process.Processes: %w", err) }

	var pts []MetricPoint
	totalCPU    := 0.0
	totalMem    := uint64(0)
	runningCount := 0

	// Top 10 prosesi CPU-ya görə sırala
	type procStat struct {
		pid  int32
		name string
		cpu  float64
		mem  uint32
	}
	var stats []procStat

	for _, pr := range procs {
		cpu, err := pr.CPUPercentWithContext(ctx)
		if err != nil { continue }
		memInfo, err := pr.MemoryInfoWithContext(ctx)
		if err != nil { continue }
		name, _ := pr.NameWithContext(ctx)
		status, _ := pr.StatusWithContext(ctx)

		totalCPU += cpu
		totalMem += memInfo.RSS
		for _, s := range status {
			if s == "R" { runningCount++; break }
		}

		stats = append(stats, procStat{
			pid: pr.Pid, name: name, cpu: cpu, mem: uint32(memInfo.RSS / 1024 / 1024),
		})
	}

	pts = append(pts,
		MetricPoint{Name: "process.count",        Value: float64(len(procs)),  Timestamp: now},
		MetricPoint{Name: "process.running",       Value: float64(runningCount), Timestamp: now},
		MetricPoint{Name: "process.total_cpu_pct", Value: round2(totalCPU),     Timestamp: now},
		MetricPoint{Name: "process.total_mem_mb",  Value: float64(totalMem / 1024 / 1024), Timestamp: now},
	)

	return pts, nil
}
