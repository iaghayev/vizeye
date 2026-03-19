package collector

import (
	"context"
	"crypto/md5"
	"fmt"
	"io"
	"os"
	"sync"
	"time"
)

// İzlənilən faylların əvvəlki hash-i
var (
	fileHashes = map[string]string{}
	filesMu    sync.Mutex
)

// Default izlənilən fayllar
var watchedFiles = []string{
	"/etc/passwd",
	"/etc/shadow",
	"/etc/hosts",
	"/etc/hostname",
	"/etc/ssh/sshd_config",
	"/etc/sudoers",
	"/etc/crontab",
}

type FileWatchCollector struct {
	Files []string
}

func NewFileWatchCollector(files []string) *FileWatchCollector {
	if len(files) == 0 {
		files = watchedFiles
	}
	return &FileWatchCollector{Files: files}
}

func (f *FileWatchCollector) Name() string { return "filewatch" }

func md5File(path string) (string, error) {
	file, err := os.Open(path)
	if err != nil { return "", err }
	defer file.Close()
	h := md5.New()
	if _, err := io.Copy(h, file); err != nil { return "", err }
	return fmt.Sprintf("%x", h.Sum(nil)), nil
}

func (f *FileWatchCollector) Collect(ctx context.Context) ([]MetricPoint, error) {
	now := time.Now()
	var pts []MetricPoint
	changed := 0
	missing := 0

	filesMu.Lock()
	defer filesMu.Unlock()

	for _, path := range f.Files {
		hash, err := md5File(path)
		if err != nil {
			missing++
			pts = append(pts, MetricPoint{
				Name:      "filewatch.missing",
				Value:     1,
				Timestamp: now,
				Tags:      map[string]string{"path": path},
			})
			continue
		}

		prev, seen := fileHashes[path]
		fileHashes[path] = hash

		if seen && prev != hash {
			changed++
			pts = append(pts, MetricPoint{
				Name:      "filewatch.changed",
				Value:     1,
				Timestamp: now,
				Tags:      map[string]string{"path": path, "hash": hash},
			})
		}
	}

	pts = append(pts,
		MetricPoint{Name: "filewatch.watched",  Value: float64(len(f.Files)), Timestamp: now},
		MetricPoint{Name: "filewatch.changed",  Value: float64(changed),      Timestamp: now},
		MetricPoint{Name: "filewatch.missing",  Value: float64(missing),      Timestamp: now},
	)

	return pts, nil
}
