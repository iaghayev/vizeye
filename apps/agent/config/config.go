package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
	"gopkg.in/yaml.v3"
)

type Config struct {
	Server     ServerConfig     `yaml:"server"`
	Collection CollectionConfig `yaml:"collection"`
	Logging    LoggingConfig    `yaml:"logging"`
	Agent      AgentConfig      `yaml:"agent"`
}

type ServerConfig struct {
	URL                 string  `yaml:"url"`
	AgentKey            string  `yaml:"agent_key"`
	TLSSkipVerify       bool    `yaml:"tls_skip_verify"`
	ConnectTimeoutSec   int     `yaml:"connect_timeout_sec"`
	RequestTimeoutSec   int     `yaml:"request_timeout_sec"`
	RetryMaxAttempts    int     `yaml:"retry_max_attempts"`
	RetryInitialDelayMs int     `yaml:"retry_initial_delay_ms"`
	RetryMaxDelaySec    int     `yaml:"retry_max_delay_sec"`
}

type CollectorToggles struct {
	CPU     bool `yaml:"cpu"`
	Memory  bool `yaml:"memory"`
	Disk    bool `yaml:"disk"`
	Load    bool `yaml:"load"`
	Network bool `yaml:"network"`
}

type CollectionConfig struct {
	IntervalSec          int              `yaml:"interval_sec"`
	HeartbeatIntervalSec int              `yaml:"heartbeat_interval_sec"`
	JitterFactor         float64          `yaml:"jitter_factor"`
	Collectors           CollectorToggles `yaml:"collectors"`
	DiskIncludeMounts    []string         `yaml:"disk_include_mounts"`
	NetworkIncludeIfaces []string         `yaml:"network_include_interfaces"`
}

type LoggingConfig struct {
	Level  string `yaml:"level"`
	Format string `yaml:"format"`
}

type AgentConfig struct {
	Version  string `yaml:"version"`
	Hostname string `yaml:"hostname"`
}

func Defaults() *Config {
	return &Config{
		Server: ServerConfig{
			URL: "http://localhost:4000", ConnectTimeoutSec: 10,
			RequestTimeoutSec: 30, RetryMaxAttempts: 5,
			RetryInitialDelayMs: 500, RetryMaxDelaySec: 60,
		},
		Collection: CollectionConfig{
			IntervalSec: 30, HeartbeatIntervalSec: 60, JitterFactor: 0.1,
			Collectors: CollectorToggles{CPU: true, Memory: true, Disk: true, Load: true, Network: true},
		},
		Logging: LoggingConfig{Level: "info", Format: "json"},
		Agent:   AgentConfig{Version: "dev"},
	}
}

func Load(path string) (*Config, error) {
	cfg := Defaults()
	if path != "" {
		data, err := os.ReadFile(path)
		if err != nil { return nil, fmt.Errorf("reading config %q: %w", path, err) }
		if err := yaml.Unmarshal(data, cfg); err != nil { return nil, fmt.Errorf("parsing config: %w", err) }
	}
	applyEnv(cfg)
	if err := validate(cfg); err != nil { return nil, err }
	return cfg, nil
}

func applyEnv(cfg *Config) {
	envStr("VIZEYE_SERVER_URL",       &cfg.Server.URL)
	envStr("VIZEYE_SERVER_AGENT_KEY", &cfg.Server.AgentKey)
	envInt("VIZEYE_COLLECTION_INTERVAL_SEC", &cfg.Collection.IntervalSec)
	envStr("VIZEYE_LOG_LEVEL",  &cfg.Logging.Level)
	envStr("VIZEYE_LOG_FORMAT", &cfg.Logging.Format)
	envStr("VIZEYE_AGENT_VERSION",  &cfg.Agent.Version)
	envStr("VIZEYE_AGENT_HOSTNAME", &cfg.Agent.Hostname)
}

func validate(cfg *Config) error {
	if strings.TrimSpace(cfg.Server.URL) == "" { return fmt.Errorf("server.url required") }
	if strings.TrimSpace(cfg.Server.AgentKey) == "" { return fmt.Errorf("server.agent_key required (set VIZEYE_SERVER_AGENT_KEY)") }
	if !strings.Contains(cfg.Server.AgentKey, ":") { return fmt.Errorf("agent_key must be format agentId:secret") }
	if cfg.Collection.IntervalSec < 5 { return fmt.Errorf("interval_sec must be >= 5") }
	return nil
}

func (c *CollectionConfig) CollectionInterval() time.Duration { return time.Duration(c.IntervalSec) * time.Second }
func (c *CollectionConfig) HeartbeatInterval() time.Duration  { return time.Duration(c.HeartbeatIntervalSec) * time.Second }
func (s *ServerConfig) RetryInitialDelay() time.Duration      { return time.Duration(s.RetryInitialDelayMs) * time.Millisecond }
func (s *ServerConfig) RetryMaxDelay() time.Duration          { return time.Duration(s.RetryMaxDelaySec) * time.Second }
func (s *ServerConfig) RequestTimeout() time.Duration         { return time.Duration(s.RequestTimeoutSec) * time.Second }

func envStr(k string, dst *string) { if v := os.Getenv(k); v != "" { *dst = v } }
func envInt(k string, dst *int)    { if v := os.Getenv(k); v != "" { if n, err := strconv.Atoi(v); err == nil { *dst = n } } }
