package collector

import (
	"context"
	"strings"
	"time"
	"github.com/shirou/gopsutil/v3/disk"
)

type DiskCollector struct{ IncludeMounts []string }
func NewDiskCollector(mounts []string) *DiskCollector { return &DiskCollector{IncludeMounts: mounts} }
func (d *DiskCollector) Name() string { return "disk" }
func (d *DiskCollector) Collect(ctx context.Context) ([]MetricPoint, error) {
	now := time.Now()
	parts, err := disk.PartitionsWithContext(ctx, false)
	if err != nil { return nil, err }
	var pts []MetricPoint
	virtual := map[string]bool{"tmpfs":true,"devtmpfs":true,"proc":true,"sysfs":true,"cgroup":true,"cgroup2":true,"overlay":true}
	for _, p := range parts {
		if virtual[strings.ToLower(p.Fstype)] { continue }
		if len(d.IncludeMounts) > 0 {
			found := false
			for _, m := range d.IncludeMounts { if p.Mountpoint == m { found = true; break } }
			if !found { continue }
		}
		u, err := disk.UsageWithContext(ctx, p.Mountpoint)
		if err != nil { continue }
		mount := p.Mountpoint; if mount == "/" { mount = "root" } else { mount = strings.ReplaceAll(strings.TrimPrefix(mount,"/"),"/","_") }
		tags := map[string]string{"mount": mount, "fstype": p.Fstype}
		pts = append(pts,
			MetricPoint{Name: "disk.total_bytes",   Value: float64(u.Total),       Timestamp: now, Tags: tags},
			MetricPoint{Name: "disk.used_bytes",    Value: float64(u.Used),        Timestamp: now, Tags: tags},
			MetricPoint{Name: "disk.free_bytes",    Value: float64(u.Free),        Timestamp: now, Tags: tags},
			MetricPoint{Name: "disk.usage_percent", Value: round2(u.UsedPercent),  Timestamp: now, Tags: tags},
		)
	}
	return pts, nil
}
