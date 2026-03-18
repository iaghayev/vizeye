BINARY    := vizeye-agent
VERSION   ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
COMMIT    ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_TIME := $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
LDFLAGS   := -ldflags "-X main.Version=$(VERSION) -X main.BuildTime=$(BUILD_TIME) -X main.Commit=$(COMMIT) -s -w"

.PHONY: build run test tidy clean

build:
	CGO_ENABLED=0 go build $(LDFLAGS) -trimpath -o bin/$(BINARY) ./

run: build
	VIZEYE_SERVER_AGENT_KEY=$(AGENT_KEY) ./bin/$(BINARY) -config config/config.yaml

test:
	go test ./... -v -race -timeout 60s

tidy:
	go mod tidy && go mod verify

clean:
	rm -rf bin/
