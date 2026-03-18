# VizEye — Infrastructure Monitoring Platform

Enterprise IT monitoring: uptime checks, agent metrics, alerting, incident management.

## Quick Start

```bash
# 1. Clone and configure
cp infra/.env.example infra/.env.dev

# 2. Start the stack
make dev-d

# 3. Setup database (wait ~30s for containers to start)
make db-setup

# 4. Open the app
# http://localhost:3000  →  admin@acme.local / Demo1234!
# http://localhost:4000/api/docs  →  API docs
```

## Architecture

- **Frontend**: Next.js 15 + TypeScript + Tailwind (port 3000)
- **Backend**: NestJS + Prisma + PostgreSQL/TimescaleDB (port 4000)
- **Cache/Queue**: Redis 7 + BullMQ
- **Agent**: Go binary (CPU, memory, disk, network metrics)

## Demo Users

| Email | Password | Role |
|-------|----------|------|
| admin@acme.local | Demo1234! | admin |
| engineer@acme.local | Demo1234! | engineer |
| ops@acme.local | Demo1234! | engineer |
| viewer@acme.local | Demo1234! | viewer |

## Commands

```bash
make dev          # Start dev stack
make dev-down     # Stop
make dev-logs     # View logs
make db-setup     # Migrate + seed
make dev-ps       # Container status
```

See `docs/RUN_INSTRUCTIONS.md` for full documentation.
