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

var (
	Version   = "dev"
	BuildTime = "unknown"
	Commit    = "unknown"
)

func main() {
	cfgPath  := flag.String("config", "config/config.yaml", "Path to config file")
	showVer  := flag.Bool("version", false, "Print version and exit")
	flag.Parse()

	if *showVer {
		fmt.Printf("VizEye Agent %s (built %s, %s/%s)\n", Version, BuildTime, runtime.GOOS, runtime.GOARCH)
		os.Exit(0)
	}

	cfg, err := config.Load(*cfgPath)
	if err != nil { fmt.Fprintf(os.Stderr, "FATAL: %v\n", err); os.Exit(1) }

	logger.MustInit(cfg.Logging.Level, cfg.Logging.Format)

	if cfg.Agent.Version == "dev" && Version != "dev" { cfg.Agent.Version = Version }

	hostname := cfg.Agent.Hostname
	if hostname == "" { if h, err := os.Hostname(); err == nil { hostname = h } }

	slog.Info("VizEye Agent starting", "version", cfg.Agent.Version, "os", runtime.GOOS, "hostname", hostname, "server", cfg.Server.URL)

	snd, err := sender.New(cfg.Server, cfg.Agent.Version)
	if err != nil { slog.Error("sender init failed", "error", err); os.Exit(1) }

	reg := collector.NewRegistry()
	c := cfg.Collection.Collectors
	if c.CPU     { reg.Register(collector.NewCPUCollector()) }
	if c.Memory  { reg.Register(collector.NewMemoryCollector()) }
	if c.Disk    { reg.Register(collector.NewDiskCollector(cfg.Collection.DiskIncludeMounts)) }
	if c.Load    { reg.Register(collector.NewLoadCollector()) }
	if c.Network { reg.Register(collector.NewNetworkCollector(cfg.Collection.NetworkIncludeIfaces)) }

	sched := scheduler.New(cfg.Collection, cfg.Server, reg, snd)

	rootCtx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		sig := <-sigCh
		slog.Info("shutdown signal", "signal", sig)
		cancel()
		time.AfterFunc(15*time.Second, func() { os.Exit(1) })
	}()

	sched.Run(rootCtx)
	slog.Info("agent stopped")
}
