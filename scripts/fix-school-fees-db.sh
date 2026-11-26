#!/bin/bash
# Repair School Fees database + API (fixes dashboard "Internal server error").
# Usage (on server):
#   cd /root/apps/shuleplus/ShulePlus && bash scripts/fix-school-fees-db.sh
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
BDIR="$REPO/SchoolFeesPortal/Backend"
AUTH_ENV="$REPO/Authentication/Backend/.env"

cd "$REPO" || exit 1

if [ ! -d "$BDIR" ]; then
  echo "ERROR: missing $BDIR"
  exit 1
fi

cd "$BDIR" || exit 1

if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
fi

if [ ! -f .env ]; then
  echo "ERROR: missing $BDIR/.env"
  exit 1
fi

echo "== sanitize DATABASE_URL + align JWT/service keys =="
python3 - <<'PY'
from pathlib import Path
import re
p = Path(".env")
out = []
for line in p.read_text(encoding="utf-8", errors="replace").splitlines():
    if line.lstrip().startswith("DATABASE_URL="):
        key, _, raw = line.partition("=")
        v = raw.strip().strip("\"'`“”‘’")
        for proto in ("postgresql://", "postgres://"):
            i = v.find(proto)
            if i > 0:
                v = v[i:]
                break
        if "connection_limit=" in v:
            v = re.sub(r"connection_limit=\d+", "connection_limit=2", v, flags=re.I)
        else:
            v = f"{v}{'&' if '?' in v else '?'}connection_limit=2"
        out.append(f"{key}={v}")
    else:
        out.append(line)
p.write_text("\n".join(out) + "\n", encoding="utf-8")
PY

# If DATABASE_URL still localhost dev default, derive from IAM or HR module
CURRENT_DB=$(grep '^DATABASE_URL=' .env | head -1 | cut -d= -f2-)
if echo "$CURRENT_DB" | grep -qE 'postgres:postgres@localhost:5432/school_fees_db'; then
  for REF in "$REPO/HR/Backend/.env" "$REPO/ActionPlanMIS/Backend/.env" "$AUTH_ENV"; do
    if [ -f "$REF" ]; then
      REF_URL=$(grep '^DATABASE_URL=' "$REF" | head -1 | cut -d= -f2- | sed -E 's/^["'\''“”‘’]+|["'\''“”‘’]+$//g')
      if echo "$REF_URL" | grep -qE '^postgres(ql)?://'; then
        NEW_URL=$(python3 - <<PY
import re
url = """$REF_URL"""
url = re.sub(r'/[^/?]+(\?|$)', r'/school_fees_db\1', url, count=1)
if 'connection_limit=' not in url:
    url += ('&' if '?' in url else '?') + 'connection_limit=2'
print(url)
PY
)
        sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$NEW_URL|" .env
        echo "  DATABASE_URL derived from $(basename "$(dirname "$(dirname "$REF")")")"
        break
      fi
    fi
  done
fi

grep -q '^PORT=' .env && sed -i 's/^PORT=.*/PORT=4004/' .env || echo 'PORT=4004' >> .env

if [ -f "$AUTH_ENV" ]; then
  AUTH_JWT=$(grep '^JWT_ACCESS_SECRET=' "$AUTH_ENV" | head -1 | cut -d= -f2- | sed -E 's/^["'\''“”‘’]+|["'\''“”‘’]+$//g')
  AUTH_KEY=$(grep -E '^(MODULE_PROVISIONING_KEY|PLATFORM_SERVICE_KEY)=' "$AUTH_ENV" | head -1 | cut -d= -f2- | sed -E 's/^["'\''“”‘’]+|["'\''“”‘’]+$//g')
  if [ -n "$AUTH_JWT" ]; then
    grep -q '^JWT_ACCESS_SECRET=' .env && sed -i "s|^JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=$AUTH_JWT|" .env \
      || echo "JWT_ACCESS_SECRET=$AUTH_JWT" >> .env
  fi
  if [ -n "$AUTH_KEY" ]; then
    for k in SERVICE_API_KEY PLATFORM_SERVICE_KEY; do
      grep -q "^${k}=" .env && sed -i "s|^${k}=.*|${k}=$AUTH_KEY|" .env || echo "${k}=$AUTH_KEY" >> .env
    done
  fi
  grep -q '^CORS_ORIGIN=' .env && sed -i 's|^CORS_ORIGIN=.*|CORS_ORIGIN=https://fees.shuleplus.rw,https://shuleplus.rw,https://app.shuleplus.rw|' .env \
    || echo 'CORS_ORIGIN=https://fees.shuleplus.rw,https://shuleplus.rw,https://app.shuleplus.rw' >> .env
fi

export DATABASE_URL="$(grep '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | sed -E 's/^["'\''“”‘’]+|["'\''“”‘’]+$//g')"
if [[ ! "$DATABASE_URL" =~ ^postgres ]]; then
  echo "ERROR: DATABASE_URL invalid: ${DATABASE_URL:0:48}…"
  exit 1
fi

echo "== ensure database school_fees_db exists =="
node "$REPO/scripts/setup-module-databases.mjs" --only=SchoolFeesPortal --skip-migrate 2>/dev/null || true

echo "== prisma generate + migrate =="
pm2 delete fees-api >/dev/null 2>&1 || true
sleep 1
npx prisma generate
npx prisma migrate deploy || npx prisma db push --accept-data-loss

echo "== redeploy fees-api =="
cd "$REPO" || exit 1
bash scripts/redeploy-module.sh true SchoolFeesPortal fees-api fees-web

echo ""
echo "== health checks =="
curl -s http://127.0.0.1:4004/api/health || true
echo ""
curl -s -o /dev/null -w "fees /api/health: %{http_code}\n" -H "Host: fees.shuleplus.rw" http://127.0.0.1:6103/api/health
