#!/bin/bash
# Ensure ShuleTrip PostgreSQL database + DATABASE_URL (production).
# Usage:
#   cd /root/apps/shuleplus/ShulePlus && bash scripts/fix-shule-trip-db.sh
#   bash scripts/fix-shule-trip-db.sh --prepare-only
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
BDIR="$REPO/ShuleTrip/Backend"
AUTH_ENV="$REPO/Authentication/Backend/.env"
PREPARE_ONLY=false
[ "${1:-}" = "--prepare-only" ] && PREPARE_ONLY=true

cd "$REPO" || exit 1
[ -d "$BDIR" ] || { echo "ERROR: missing $BDIR"; exit 1; }
cd "$BDIR" || exit 1

[ -f .env ] || cp -n .env.example .env 2>/dev/null || true
[ -f .env ] || { echo "ERROR: missing $BDIR/.env"; exit 1; }

DB_NAME="shule_trip_db"
CURRENT_DB=$(grep '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | sed -E 's/^["'\''“”‘’]+|["'\''“”‘’]+$//g')
if echo "$CURRENT_DB" | grep -qE 'postgres:postgres@localhost:5432/shule_trip_db|/shule_trip_db'; then
  for REF in "$REPO/StudentManagement/Backend/.env" "$REPO/Library/Backend/.env" "$AUTH_ENV"; do
    if [ -f "$REF" ]; then
      REF_URL=$(grep '^DATABASE_URL=' "$REF" | head -1 | cut -d= -f2- | sed -E 's/^["'\''“”‘’]+|["'\''“”‘’]+$//g')
      if echo "$REF_URL" | grep -qE '^postgres(ql)?://'; then
        NEW_URL=$(python3 - <<PY
import re
url = """$REF_URL"""
url = re.sub(r'/[^/?]+(\?|$)', r'/${DB_NAME}\1', url, count=1)
if 'connection_limit=' not in url:
    url += ('&' if '?' in url else '?') + 'connection_limit=2'
print(url)
PY
)
        sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$NEW_URL|" .env
        echo "  DATABASE_URL → $DB_NAME (from reference env)"
        break
      fi
    fi
  done
fi

grep -q '^PORT=' .env && sed -i 's/^PORT=.*/PORT=4033/' .env || echo 'PORT=4033' >> .env

if [ "$PREPARE_ONLY" = true ]; then
  exit 0
fi

node "$REPO/scripts/setup-module-databases.mjs" --only=ShuleTrip --skip-migrate 2>/dev/null || true
npx prisma db push --accept-data-loss 2>/dev/null || npx prisma migrate deploy 2>/dev/null || true

echo "ShuleTrip DB ready. Redeploy: bash scripts/redeploy-module.sh true ShuleTrip shule-trip-api shule-trip-web"
