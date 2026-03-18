package scheduler

import (
	"context"
	"log/slog"
	"time"

	"github.com/vizeye/agent/collector"
	"github.com/vizeye/agent/config"
	"github.com/vizeye/agent/sender"
)

type Scheduler struct {
	cfg       config.CollectionConfig
	serverCfg config.ServerConfig
	registry  *collector.Registry
	sender    *sender.Sender
}

func New(cfg config.CollectionConfig, sc config.ServerConfig, reg *collector.Registry, snd *sender.Sender) *Scheduler {
	return &Scheduler{cfg: cfg, serverCfg: sc, registry: reg, sender: snd}
}

func (s *Scheduler) Run(ctx context.Context) {
	slog.Info("scheduler starting", "interval_sec", s.cfg.IntervalSec, "heartbeat_sec", s.cfg.HeartbeatIntervalSec)
	s.collect(ctx)
	s.heartbeat(ctx)
	collect   := time.NewTicker(s.cfg.CollectionInterval())
	heartbeat := time.NewTicker(s.cfg.HeartbeatInterval())
	defer collect.Stop(); defer heartbeat.Stop()
	for {
		select {
		case <-ctx.Done():
			slog.Info("scheduler stopping"); return
		case <-collect.C:
			s.collect(ctx)
		case <-heartbeat.C:
			s.heartbeat(ctx)
		}
	}
}

func (s *Scheduler) collect(ctx context.Context) {
	cCtx, cancel := context.WithTimeout(ctx, 25*time.Second); defer cancel()
	start := time.Now()
	pts := s.registry.CollectAll(cCtx)
	slog.Debug("collected", "points", len(pts), "ms", time.Since(start).Milliseconds())
	if len(pts) == 0 { return }
	sCtx, scancel := context.WithTimeout(ctx, s.serverCfg.RequestTimeout()); defer scancel()
	r := s.sender.SendMetrics(sCtx, pts)
	if r.Succeeded() {
		slog.Info("metrics delivered", "points", len(pts), "status", r.StatusCode, "ms", r.Duration.Milliseconds())
	} else {
		slog.Error("metrics failed", "error", r.Err, "status", r.StatusCode)
	}
}

func (s *Scheduler) heartbeat(ctx context.Context) {
	hCtx, cancel := context.WithTimeout(ctx, 10*time.Second); defer cancel()
	r := s.sender.SendHeartbeat(hCtx)
	if r.Succeeded() { slog.Debug("heartbeat ok") } else { slog.Warn("heartbeat failed", "err", r.Err) }
}
