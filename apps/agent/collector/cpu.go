package collector

import (
	"context"
	"fmt"
	"time"
	"github.com/shirou/gopsutil/v3/cpu"
)

type CPUCollector struct{}
func NewCPUCollector() *CPUCollector { return &CPUCollector{} }
func (c *CPUCollector) Name() string { return "cpu" }
func (c *CPUCollector) Collect(ctx context.Context) ([]MetricPoint, error) {
	now := time.Now()
	pct, err := cpu.PercentWithContext(ctx, 200*time.Millisecond, false)
	if err != nil { return nil, fmt.Errorf("cpu.Percent: %w", err) }
	pts := []MetricPoint{}
	if len(pct) > 0 {
		pts = append(pts, MetricPoint{Name: "cpu.usage_percent", Value: round2(pct[0]), Timestamp: now})
	}
	if lc, err := cpu.CountsWithContext(ctx, true); err == nil {
		pts = append(pts, MetricPoint{Name: "cpu.logical_count", Value: float64(lc), Timestamp: now})
	}
	if times, err := cpu.TimesWithContext(ctx, false); err == nil && len(times) > 0 {
		t := times[0]
		total := t.User + t.System + t.Idle + t.Iowait + t.Steal
		if total > 0 {
			pts = append(pts,
				MetricPoint{Name: "cpu.user_percent",   Value: round2(t.User/total*100),   Timestamp: now},
				MetricPoint{Name: "cpu.system_percent", Value: round2(t.System/total*100), Timestamp: now},
				MetricPoint{Name: "cpu.iowait_percent", Value: round2(t.Iowait/total*100), Timestamp: now},
				MetricPoint{Name: "cpu.idle_percent",   Value: round2(t.Idle/total*100),   Timestamp: now},
			)
		}
	}
	return pts, nil
}
