package collector

import (
	"context"
	"strings"
	"time"
	"github.com/shirou/gopsutil/v3/net"
)

type NetworkCollector struct {
	IncludeInterfaces []string
	prevSample        map[string]net.IOCountersStat
	prevTime          time.Time
}

func NewNetworkCollector(ifaces []string) *NetworkCollector {
	return &NetworkCollector{IncludeInterfaces: ifaces, prevSample: make(map[string]net.IOCountersStat)}
}
func (n *NetworkCollector) Name() string { return "network" }
func (n *NetworkCollector) Collect(ctx context.Context) ([]MetricPoint, error) {
	now := time.Now()
	counters, err := net.IOCountersWithContext(ctx, true)
	if err != nil { return nil, err }
	elapsed := now.Sub(n.prevTime).Seconds(); if elapsed <= 0 { elapsed = 1 }
	var pts []MetricPoint
	for _, c := range counters {
		if c.Name == "lo" || strings.HasPrefix(c.Name, "lo:") { continue }
		if len(n.IncludeInterfaces) > 0 {
			found := false
			for _, i := range n.IncludeInterfaces { if c.Name == i { found = true; break } }
			if !found { continue }
		}
		tags := map[string]string{"interface": c.Name}
		pts = append(pts,
			MetricPoint{Name: "net.bytes_sent_total",   Value: float64(c.BytesSent),   Timestamp: now, Tags: tags},
			MetricPoint{Name: "net.bytes_recv_total",   Value: float64(c.BytesRecv),   Timestamp: now, Tags: tags},
			MetricPoint{Name: "net.packets_sent_total", Value: float64(c.PacketsSent), Timestamp: now, Tags: tags},
			MetricPoint{Name: "net.packets_recv_total", Value: float64(c.PacketsRecv), Timestamp: now, Tags: tags},
			MetricPoint{Name: "net.errors_in_total",    Value: float64(c.Errin),       Timestamp: now, Tags: tags},
			MetricPoint{Name: "net.errors_out_total",   Value: float64(c.Errout),      Timestamp: now, Tags: tags},
		)
		if prev, ok := n.prevSample[c.Name]; ok && !n.prevTime.IsZero() {
			sent := float64(c.BytesSent-prev.BytesSent) / elapsed
			recv := float64(c.BytesRecv-prev.BytesRecv) / elapsed
			if sent >= 0 && recv >= 0 {
				pts = append(pts,
					MetricPoint{Name: "net.bytes_sent_per_sec", Value: round2(sent), Timestamp: now, Tags: tags},
					MetricPoint{Name: "net.bytes_recv_per_sec", Value: round2(recv), Timestamp: now, Tags: tags},
				)
			}
		}
		n.prevSample[c.Name] = c
	}
	n.prevTime = now
	return pts, nil
}
