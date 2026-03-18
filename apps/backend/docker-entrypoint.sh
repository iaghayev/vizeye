#!/bin/sh
set -e
echo "[entrypoint] Starting VizEye Backend..."
echo "[entrypoint] NODE_ENV=${NODE_ENV}"

echo "[entrypoint] Waiting for PostgreSQL..."
DB_HOST=$(echo "$DATABASE_URL" | sed 's|.*@||;s|:.*||;s|/.*||')
DB_USER=$(echo "$DATABASE_URL" | sed 's|.*://||;s|:.*||')
until pg_isready -h "$DB_HOST" -U "$DB_USER" 2>/dev/null; do
  echo "[entrypoint] PostgreSQL not ready — retrying in 2s..."
  sleep 2
done
echo "[entrypoint] PostgreSQL is ready."

echo "[entrypoint] Running database migrations..."
npx prisma migrate deploy

echo "[entrypoint] Applying TimescaleDB setup..."
psql "$DATABASE_URL" -f prisma/post_migrate.sql -v ON_ERROR_STOP=0 --quiet 2>/dev/null \
  || echo "[entrypoint] TimescaleDB setup skipped (already applied)"

SEED_COUNT=$(psql "$DATABASE_URL" -tAc 'SELECT COUNT(*) FROM "Organization"' 2>/dev/null || echo "0")
if [ "$SEED_COUNT" = "0" ]; then
  echo "[entrypoint] Seeding database..."
  npx ts-node -r tsconfig-paths/register prisma/seed.ts || echo "[entrypoint] Seed skipped"
else
  echo "[entrypoint] Already seeded (${SEED_COUNT} org found) — skipping."
fi

echo "[entrypoint] Starting application..."
exec "$@"
