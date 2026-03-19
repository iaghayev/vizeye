package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"github.com/vizeye/agent/collector"
	"github.com/vizeye/agent/config"
	"github.com/vizeye/agent/logger"
	"github.com/vizeye/agent/scheduler"
	"github.com/vizeye/agent/sender"
)

var Version = "1.2.0"

func main() {
	cfgPath := flag.String("config", "config/config.yaml", "Config file path")
	showVer := flag.Bool("version", false, "Print version")
	flag.Parse()

	if *showVer {
		fmt.Printf("VizEye Agent %s (%s/%s)\n", Version, runtime.GOOS, runtime.GOARCH)
		os.Exit(0)
	}

	cfg, err := config.Load(*cfgPath)
	if err != nil { fmt.Fprintf(os.Stderr, "FATAL: %v\n", err); os.Exit(1) }

	logger.MustInit(cfg.Logging.Level, cfg.Logging.Format)

	hostname := cfg.Agent.Hostname
	if hostname == "" { if h, err := os.Hostname(); err == nil { hostname = h } }

	slog.Info("VizEye Agent starting", "version", Version, "hostname", hostname)

	snd, err := sender.New(cfg.Server, Version)
	if err != nil { slog.Error("sender init failed", "error", err); os.Exit(1) }

	reg := buildRegistry(cfg)
	sched := scheduler.New(cfg.Collection, cfg.Server, reg, snd)

	rootCtx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		slog.Info("shutdown")
		cancel()
		time.AfterFunc(10*time.Second, func() { os.Exit(1) })
	}()

	sched.Run(rootCtx)
}

func buildRegistry(cfg *config.Config) *collector.Registry {
	reg := collector.NewRegistry()
	c   := cfg.Collection.Collectors

	if c.CPU     { reg.Register(collector.NewCPUCollector()) }
	if c.Memory  { reg.Register(collector.NewMemoryCollector()) }
	if c.Disk    { reg.Register(collector.NewDiskCollector(cfg.Collection.DiskIncludeMounts)) }
	if c.Load    { reg.Register(collector.NewLoadCollector()) }
	if c.Network { reg.Register(collector.NewNetworkCollector(cfg.Collection.NetworkIncludeIfaces)) }

	// Genişləndirilmiş collector-lar
	reg.Register(collector.NewProcessCollector())
	reg.Register(collector.NewDockerCollector())
	reg.Register(collector.NewSyslogCollector())
	reg.Register(collector.NewFileWatchCollector(nil)) // default fayllar

	slog.Info("all collectors registered")
	return reg
}
