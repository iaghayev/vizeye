package collector

import (
	"bufio"
	"context"
	"os/exec"
	"strings"
	"time"
)

type SyslogCollector struct{}
func NewSyslogCollector() *SyslogCollector { return &SyslogCollector{} }
func (s *SyslogCollector) Name() string     { return "syslog" }

func (s *SyslogCollector) Collect(ctx context.Context) ([]MetricPoint, error) {
	now := time.Now()
	var pts []MetricPoint

	// journald mövcuddurmu?
	if _, err := exec.LookPath("journalctl"); err != nil {
		return nil, nil
	}

	// Son 1 dəqiqədəki error/critical sayı
	cmd := exec.CommandContext(ctx, "journalctl",
		"--since", "1 minute ago",
		"-p", "err",
		"--no-pager", "-q",
		"--output=short")
	out, err := cmd.Output()
	if err != nil { return nil, nil }

	errCount  := 0
	warnCount := 0
	scanner := bufio.NewScanner(strings.NewReader(string(out)))
	for scanner.Scan() {
		line := strings.ToLower(scanner.Text())
		if strings.Contains(line, "error") || strings.Contains(line, "failed") || strings.Contains(line, "critical") {
			errCount++
		} else if strings.Contains(line, "warn") {
			warnCount++
		}
	}

	pts = append(pts,
		MetricPoint{Name: "syslog.errors_per_min",   Value: float64(errCount),  Timestamp: now},
		MetricPoint{Name: "syslog.warnings_per_min",  Value: float64(warnCount), Timestamp: now},
	)

	// systemd unit failures
	failCmd := exec.CommandContext(ctx, "systemctl", "list-units",
		"--state=failed", "--no-legend", "--no-pager")
	failOut, err := failCmd.Output()
	if err == nil {
		failed := 0
		sc2 := bufio.NewScanner(strings.NewReader(string(failOut)))
		for sc2.Scan() {
			if strings.TrimSpace(sc2.Text()) != "" { failed++ }
		}
		pts = append(pts, MetricPoint{Name: "systemd.failed_units", Value: float64(failed), Timestamp: now})
	}

	return pts, nil
}
