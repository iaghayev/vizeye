package logger

import (
	"fmt"
	"log/slog"
	"os"
	"strings"
)

func Init(level, format string) error {
	lvl := slog.LevelInfo
	switch strings.ToLower(level) {
	case "debug": lvl = slog.LevelDebug
	case "warn":  lvl = slog.LevelWarn
	case "error": lvl = slog.LevelError
	}
	opts := &slog.HandlerOptions{Level: lvl}
	var h slog.Handler
	if strings.ToLower(format) == "text" { h = slog.NewTextHandler(os.Stdout, opts) } else { h = slog.NewJSONHandler(os.Stdout, opts) }
	slog.SetDefault(slog.New(h))
	return nil
}

func MustInit(level, format string) {
	if err := Init(level, format); err != nil { fmt.Fprintf(os.Stderr, "logger init error: %v\n", err); os.Exit(1) }
}
