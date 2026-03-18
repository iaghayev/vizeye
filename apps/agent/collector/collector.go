package collector

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"
)

type MetricPoint struct {
	Name      string            `json:"name"`
	Value     float64           `json:"value"`
	Timestamp time.Time         `json:"timestamp"`
	Tags      map[string]string `json:"tags,omitempty"`
}

type Collector interface {
	Name() string
	Collect(ctx context.Context) ([]MetricPoint, error)
}

type Registry struct {
	mu         sync.RWMutex
	collectors []Collector
}

func NewRegistry() *Registry { return &Registry{} }

func (r *Registry) Register(c Collector) {
	r.mu.Lock(); defer r.mu.Unlock()
	r.collectors = append(r.collectors, c)
}

func (r *Registry) CollectAll(ctx context.Context) []MetricPoint {
	r.mu.RLock()
	cols := make([]Collector, len(r.collectors))
	copy(cols, r.collectors)
	r.mu.RUnlock()

	type res struct { pts []MetricPoint; err error; name string }
	ch := make(chan res, len(cols))
	var wg sync.WaitGroup

	for _, c := range cols {
		wg.Add(1)
		go func(col Collector) {
			defer wg.Done()
			pts, err := safeCollect(ctx, col)
			ch <- res{name: col.Name(), pts: pts, err: err}
		}(c)
	}
	go func() { wg.Wait(); close(ch) }()

	var all []MetricPoint
	for r := range ch {
		if r.err != nil { slog.Warn("collector error", "collector", r.name, "error", r.err); continue }
		all = append(all, r.pts...)
	}
	return all
}

func safeCollect(ctx context.Context, c Collector) (pts []MetricPoint, err error) {
	defer func() { if r := recover(); r != nil { err = fmt.Errorf("panic: %v", r) } }()
	return c.Collect(ctx)
}

func round2(v float64) float64 {
	return float64(int(v*100+0.5)) / 100
}
