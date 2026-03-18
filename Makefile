.PHONY: help dev dev-d dev-down dev-build dev-logs dev-ps db-setup db-seed clean ssl-gen

COMPOSE_DEV  = docker compose -f infra/docker-compose.yml -f infra/docker-compose.dev.yml
COMPOSE_PROD = docker compose -f infra/docker-compose.yml

.DEFAULT_GOAL := help

help:
	@echo ""
	@echo "  VizEye — Available Commands"
	@echo "  ─────────────────────────────────────────"
	@echo "  make dev          Start full dev stack"
	@echo "  make dev-d        Start dev stack (detached)"
	@echo "  make dev-down     Stop dev stack"
	@echo "  make dev-build    Rebuild all images"
	@echo "  make dev-logs     Tail all logs"
	@echo "  make dev-ps       Show container status"
	@echo "  make db-setup     Run migrations + seed"
	@echo "  make db-seed      Seed only"
	@echo "  make ssl-gen      Generate SSL cert"
	@echo "  make clean        Remove all (destroys data!)"
	@echo ""

dev: _check-env ssl-gen
	$(COMPOSE_DEV) up

dev-d: _check-env ssl-gen
	$(COMPOSE_DEV) up -d

dev-down:
	$(COMPOSE_DEV) down

dev-build:
	$(COMPOSE_DEV) build --no-cache

dev-logs:
	$(COMPOSE_DEV) logs -f --tail=100

dev-ps:
	$(COMPOSE_DEV) ps

db-setup:
	$(COMPOSE_DEV) exec backend sh -c "npm run db:setup:dev"

db-seed:
	$(COMPOSE_DEV) exec backend npm run db:seed

ssl-gen:
	@if [ ! -f infra/nginx/ssl/server.crt ]; then bash infra/scripts/gen-ssl.sh; fi

clean:
	@echo "WARNING: This destroys all data. Ctrl+C to cancel..."
	@sleep 3
	$(COMPOSE_DEV) down -v --remove-orphans
	rm -rf apps/backend/dist apps/frontend/.next apps/agent/bin

_check-env:
	@if [ ! -f infra/.env.dev ]; then \
		echo ""; echo "  ERROR: infra/.env.dev not found"; \
		echo "  Run: cp infra/.env.example infra/.env.dev"; echo ""; exit 1; fi
