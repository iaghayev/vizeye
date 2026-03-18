package sender

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"math"
	"math/rand"
	"net"
	"net/http"
	"time"

	"github.com/vizeye/agent/collector"
	"github.com/vizeye/agent/config"
)

type MetricPayload struct {
	Metrics      []MetricItem `json:"metrics"`
	AgentVersion string       `json:"agentVersion,omitempty"`
}

type MetricItem struct {
	Name      string            `json:"name"`
	Value     float64           `json:"value"`
	Timestamp string            `json:"timestamp,omitempty"`
	Tags      map[string]string `json:"tags,omitempty"`
}

type HeartbeatPayload struct {
	AgentVersion string `json:"agentVersion,omitempty"`
}

type SendResult struct {
	Attempt    int
	StatusCode int
	Err        error
	Duration   time.Duration
}

func (r SendResult) Succeeded() bool {
	return r.Err == nil && r.StatusCode >= 200 && r.StatusCode < 300
}

type Sender struct {
	cfg    config.ServerConfig
	client *http.Client
	ver    string
}

func New(cfg config.ServerConfig, ver string) (*Sender, error) {
	tlsCfg := &tls.Config{MinVersion: tls.VersionTLS12, InsecureSkipVerify: cfg.TLSSkipVerify}
	transport := &http.Transport{
		TLSClientConfig: tlsCfg,
		DialContext: (&net.Dialer{Timeout: time.Duration(cfg.ConnectTimeoutSec) * time.Second, KeepAlive: 30 * time.Second}).DialContext,
		MaxIdleConns: 10, IdleConnTimeout: 90 * time.Second,
	}
	return &Sender{cfg: cfg, ver: ver, client: &http.Client{Transport: transport, Timeout: cfg.RequestTimeout()}}, nil
}

func (s *Sender) SendMetrics(ctx context.Context, pts []collector.MetricPoint) SendResult {
	if len(pts) == 0 { return SendResult{StatusCode: 204} }
	items := make([]MetricItem, 0, len(pts))
	for _, p := range pts {
		items = append(items, MetricItem{Name: p.Name, Value: p.Value, Timestamp: p.Timestamp.UTC().Format(time.RFC3339Nano), Tags: p.Tags})
	}
	return s.postWithRetry(ctx, s.cfg.URL+"/api/v1/ingest/metrics", MetricPayload{Metrics: items, AgentVersion: s.ver})
}

func (s *Sender) SendHeartbeat(ctx context.Context) SendResult {
	return s.postWithRetry(ctx, s.cfg.URL+"/api/v1/ingest/heartbeat", HeartbeatPayload{AgentVersion: s.ver})
}

func (s *Sender) postWithRetry(ctx context.Context, url string, body interface{}) SendResult {
	data, err := json.Marshal(body)
	if err != nil { return SendResult{Err: fmt.Errorf("marshal: %w", err)} }
	var last SendResult
	for attempt := 1; attempt <= s.cfg.RetryMaxAttempts; attempt++ {
		if ctx.Err() != nil { return SendResult{Attempt: attempt, Err: ctx.Err()} }
		start := time.Now()
		r := s.doPost(ctx, url, data)
		r.Attempt = attempt; r.Duration = time.Since(start); last = r
		if r.Succeeded() { return r }
		if r.StatusCode >= 400 && r.StatusCode < 500 && r.StatusCode != 429 && r.StatusCode != 408 {
			slog.Error("permanent failure", "url", url, "status", r.StatusCode); return r
		}
		if attempt == s.cfg.RetryMaxAttempts { break }
		delay := s.delay(attempt)
		slog.Warn("retrying", "attempt", attempt, "delay_ms", delay.Milliseconds(), "err", r.Err)
		select { case <-ctx.Done(): return SendResult{Err: ctx.Err()}; case <-time.After(delay): }
	}
	return last
}

func (s *Sender) doPost(ctx context.Context, url string, data []byte) SendResult {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(data))
	if err != nil { return SendResult{Err: err} }
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Agent-Key", s.cfg.AgentKey)
	req.Header.Set("User-Agent", "VizEye-Agent/"+s.ver)
	resp, err := s.client.Do(req)
	if err != nil { return SendResult{Err: err} }
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return SendResult{StatusCode: resp.StatusCode, Err: fmt.Errorf("HTTP %d", resp.StatusCode)}
	}
	return SendResult{StatusCode: resp.StatusCode}
}

func (s *Sender) delay(attempt int) time.Duration {
	base := s.cfg.RetryInitialDelay()
	d := time.Duration(float64(base) * math.Pow(2, float64(attempt-1)))
	if d > s.cfg.RetryMaxDelay() { d = s.cfg.RetryMaxDelay() }
	d += time.Duration(float64(d) * 0.1 * (2*rand.Float64() - 1))
	if d < 100*time.Millisecond { d = 100 * time.Millisecond }
	return d
}
