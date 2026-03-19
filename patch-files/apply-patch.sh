#!/bin/bash
# VizEye Patch — Dashboard fix + SNMP merge + Online/Offline fix
# Serverdə /opt/vizeye qovluğunda işlədin:
#   bash apply-patch.sh

set -e
BASE="/opt/vizeye"

echo "═══════════════════════════════════════════════════"
echo "  VizEye Patch — Applying fixes..."
echo "═══════════════════════════════════════════════════"

# 1) Backend: org stats — onlineAssets əlavə et
echo "[1/5] Backend org stats fix..."
cp patch-files/organizations.service.ts \
   "$BASE/apps/backend/src/modules/organizations/organizations.service.ts"

# 2) Frontend: Dashboard — düzgün API endpoint + online/offline fix
echo "[2/5] Dashboard page fix..."
cp patch-files/dashboard-page.tsx \
   "$BASE/apps/frontend/src/app/(app)/dashboard/page.tsx"

# 3) Frontend: Dashboard API — düzgün endpoint
echo "[3/5] Dashboard API fix..."
cp patch-files/dashboard.api.ts \
   "$BASE/apps/frontend/src/lib/api/dashboard.api.ts"

# 4) Frontend: SNMP page → monitors-a redirect
echo "[4/5] SNMP → Monitors redirect..."
cp patch-files/snmp-redirect-page.tsx \
   "$BASE/apps/frontend/src/app/(app)/snmp-devices/page.tsx"

# 5) Frontend: Sidebar — SNMP nav çıxarıldı
echo "[5/5] Sidebar update (SNMP removed)..."
cp patch-files/sidebar.tsx \
   "$BASE/apps/frontend/src/components/layout/sidebar.tsx"

# Ensure backend public dir exists
mkdir -p "$BASE/apps/backend/public"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✓ Patch applied! Now rebuild:"
echo ""
echo "  cd $BASE"
echo "  docker compose -f infra/docker-compose.yml up -d --build backend"
echo "  docker compose -f infra/docker-compose.yml up -d --build frontend"
echo "═══════════════════════════════════════════════════"
