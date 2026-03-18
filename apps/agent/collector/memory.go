package collector

import (
	"context"
	"fmt"
	"time"
	"github.com/shirou/gopsutil/v3/mem"
)

type MemoryCollector struct{}
func NewMemoryCollector() *MemoryCollector { return &MemoryCollector{} }
func (m *MemoryCollector) Name() string { return "memory" }
func (m *MemoryCollector) Collect(ctx context.Context) ([]MetricPoint, error) {
	now := time.Now()
	v, err := mem.VirtualMemoryWithContext(ctx)
	if err != nil { return nil, fmt.Errorf("mem.VirtualMemory: %w", err) }
	pts := []MetricPoint{
		{Name: "mem.total_bytes",     Value: float64(v.Total),     Timestamp: now},
		{Name: "mem.used_bytes",      Value: float64(v.Used),      Timestamp: now},
		{Name: "mem.available_bytes", Value: float64(v.Available), Timestamp: now},
		{Name: "mem.free_bytes",      Value: float64(v.Free),      Timestamp: now},
		{Name: "mem.usage_percent",   Value: round2(v.UsedPercent), Timestamp: now},
		{Name: "mem.cached_bytes",    Value: float64(v.Cached),    Timestamp: now},
	}
	if s, err := mem.SwapMemoryWithContext(ctx); err == nil {
		pts = append(pts,
			MetricPoint{Name: "mem.swap_total_bytes",   Value: float64(s.Total),      Timestamp: now},
			MetricPoint{Name: "mem.swap_used_bytes",    Value: float64(s.Used),       Timestamp: now},
			MetricPoint{Name: "mem.swap_usage_percent", Value: round2(s.UsedPercent), Timestamp: now},
		)
	}
	return pts, nil
}
