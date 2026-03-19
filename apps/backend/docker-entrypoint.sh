#!/bin/sh
set -e

echo "[entrypoint] Starting VizEye Backend..."
echo "[entrypoint] NODE_ENV=${NODE_ENV}"

echo "[entrypoint] Waiting for PostgreSQL..."
until pg_isready -h postgres -U vizeye 2>/dev/null; do
  echo "[entrypoint] Waiting..."
  sleep 2
done
echo "[entrypoint] PostgreSQL is ready."

echo "[entrypoint] Applying database schema..."
node_modules/.bin/prisma db push --skip-generate --accept-data-loss \
  && echo "[entrypoint] Schema applied." \
  || echo "[entrypoint] Schema warning"

echo "[entrypoint] Applying TimescaleDB setup..."
psql "$DATABASE_URL" -f prisma/post_migrate.sql \
  -v ON_ERROR_STOP=0 --quiet 2>/dev/null \
  || echo "[entrypoint] TimescaleDB already configured"

SEED_COUNT=$(psql "$DATABASE_URL" -tAc \
  'SELECT COUNT(*) FROM "Organization"' 2>/dev/null \
  | tr -d '[:space:]' || echo "0")
echo "[entrypoint] Org count: $SEED_COUNT"

if [ "$SEED_COUNT" = "0" ]; then
  echo "[entrypoint] Seeding database..."
  node_modules/.bin/ts-node \
    -r tsconfig-paths/register \
    prisma/seed.ts \
    && echo "[entrypoint] Seed complete." \
    || echo "[entrypoint] Seed failed — continuing"
else
  echo "[entrypoint] Already seeded — skipping."
fi

echo "[entrypoint] Starting app..."
exec "$@"
