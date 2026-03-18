package collector

import (
	"context"
	"runtime"
	"time"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/load"
)

type LoadCollector struct{}
func NewLoadCollector() *LoadCollector { return &LoadCollector{} }
func (l *LoadCollector) Name() string { return "load" }
func (l *LoadCollector) Collect(ctx context.Context) ([]MetricPoint, error) {
	now := time.Now()
	var pts []MetricPoint
	if runtime.GOOS != "windows" {
		if avg, err := load.AvgWithContext(ctx); err == nil {
			lc, _ := cpu.CountsWithContext(ctx, true); if lc <= 0 { lc = 1 }
			pts = append(pts,
				MetricPoint{Name: "load.1m",         Value: round2(avg.Load1),                   Timestamp: now},
				MetricPoint{Name: "load.5m",         Value: round2(avg.Load5),                   Timestamp: now},
				MetricPoint{Name: "load.15m",        Value: round2(avg.Load15),                  Timestamp: now},
				MetricPoint{Name: "load.1m_per_cpu", Value: round2(avg.Load1/float64(lc)), Timestamp: now},
			)
		}
	}
	if info, err := host.InfoWithContext(ctx); err == nil {
		pts = append(pts, MetricPoint{Name: "system.uptime_sec", Value: float64(info.Uptime), Timestamp: now})
	}
	return pts, nil
}
