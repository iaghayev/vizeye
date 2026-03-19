package collector

import (
	"bufio"
	"context"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

type DockerCollector struct{}
func NewDockerCollector() *DockerCollector { return &DockerCollector{} }
func (d *DockerCollector) Name() string     { return "docker" }

func (d *DockerCollector) Collect(ctx context.Context) ([]MetricPoint, error) {
	now := time.Now()

	// Docker mövcuddurmu?
	if _, err := exec.LookPath("docker"); err != nil {
		return nil, nil // Docker yoxdur — skip
	}

	cmd := exec.CommandContext(ctx, "docker", "ps", "--format",
		"{{.Names}}\t{{.Status}}\t{{.RunningFor}}")
	out, err := cmd.Output()
	if err != nil { return nil, nil }

	var pts  []MetricPoint
	total   := 0
	running := 0

	scanner := bufio.NewScanner(strings.NewReader(string(out)))
	for scanner.Scan() {
		line  := scanner.Text()
		parts := strings.Split(line, "\t")
		if len(parts) < 2 { continue }
		total++
		if strings.HasPrefix(parts[1], "Up") { running++ }
	}

	pts = append(pts,
		MetricPoint{Name: "docker.containers_total",   Value: float64(total),   Timestamp: now},
		MetricPoint{Name: "docker.containers_running",  Value: float64(running), Timestamp: now},
		MetricPoint{Name: "docker.containers_stopped",  Value: float64(total - running), Timestamp: now},
	)

	// docker stats --no-stream
	statsCmd := exec.CommandContext(ctx, "docker", "stats", "--no-stream",
		"--format", "{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}")
	statsOut, err := statsCmd.Output()
	if err != nil { return pts, nil }

	scanner2 := bufio.NewScanner(strings.NewReader(string(statsOut)))
	for scanner2.Scan() {
		line  := scanner2.Text()
		parts := strings.Split(line, "\t")
		if len(parts) < 3 { continue }
		name  := parts[0]
		cpuStr := strings.TrimSuffix(parts[1], "%")
		cpu, err := strconv.ParseFloat(cpuStr, 64)
		if err != nil { continue }

		tags := map[string]string{"container": name}
		pts = append(pts,
			MetricPoint{Name: "docker.container_cpu_pct", Value: round2(cpu), Timestamp: now, Tags: tags},
		)
	}

	return pts, nil
}
