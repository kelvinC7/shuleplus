#!/bin/bash
# Emergency: Postgres on port 5433 is full — stop PM2 backends, verify psql, restart ShulePlus APIs.
# Usage: bash scripts/fix-postgres-emergency.sh
set -uo pipefail

PG_PORT="${PG_PORT:-5433}"
REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"

SHULEPLUS_APIS=(
  auth-api academic-api teachers-api fees-api budget-api payroll-api hr-api
  attendance-api action-plan-api procurement-api inventory-api assets-api
  canteen-api timetable-api parents-api nesa-api babyeyi-api kazi-api
  discipline-api demo-api materials-api tasks-api uniform-api
  student-management-api mini-website-api
)

OTHER_PG_BACKENDS=(
  mtms-backend travooz-backend travooz-hms-backend resort_ms-backend
  excelschool-backend shulecanteen-backend ntucikwe-backend iam-charity-backend
  yoguide-backend yoInfo_be young-explorer-backend artisan-shop-backend
)

echo "== STOP all ShulePlus APIs =="
pm2 stop "${SHULEPLUS_APIS[@]}" 2>/dev/null || true

echo "== STOP other known Postgres backends (same host) =="
pm2 stop "${OTHER_PG_BACKENDS[@]}" 2>/dev/null || true

sleep 5

echo "== Test Postgres =="
if sudo -u postgres psql -p "$PG_PORT" -c "SELECT count(*) AS connections FROM pg_stat_activity;"; then
  sudo -u postgres psql -p "$PG_PORT" -c "SHOW max_connections;"
else
  echo "Still saturated — run: pm2 stop all   then retry psql"
  exit 1
fi

echo "== START ShulePlus APIs (uses connection_limit=2 from .env) =="
cd "$REPO" || exit 1
for name in "${SHULEPLUS_APIS[@]}"; do
  pm2 describe "$name" >/dev/null 2>&1 && pm2 start "$name" --update-env 2>/dev/null || true
done
pm2 save >/dev/null 2>&1 || true

sleep 3
sudo -u postgres psql -p "$PG_PORT" -c "SELECT count(*) AS connections FROM pg_stat_activity;"
curl -sS -m 8 http://127.0.0.1:4017/api/health || true
echo
echo "Emergency recovery done. Reload babyeyi dashboard."
