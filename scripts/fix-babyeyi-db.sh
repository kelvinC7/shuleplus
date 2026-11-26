#!/bin/bash
# Ensure babyeyi_wizard_db exists and Prisma schema (tenants, circulars, …) is applied.
# Usage (on server):
#   cd /root/apps/shuleplus/ShulePlus && bash scripts/fix-babyeyi-db.sh
#   bash scripts/fix-babyeyi-db.sh --prepare-only   # DB + schema only (used by redeploy)
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
BDIR="$REPO/BabyeyiWizard/Backend"
AUTH_ENV="$REPO/Authentication/Backend/.env"
LOG="${LOG:-/tmp/fix-babyeyi-db.log}"
PREPARE_ONLY=false
[ "${1:-}" = "--prepare-only" ] && PREPARE_ONLY=true

# psql does not accept Prisma query params (e.g. connection_limit=2)
strip_psql_url() {
  echo "$1" | sed -E 's/\?.*$//'
}

cd "$REPO" || exit 1

if [ ! -d "$BDIR" ]; then
  echo "ERROR: missing $BDIR"
  exit 1
fi

cd "$BDIR" || exit 1

if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo "  copied .env.example → .env"
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

CURRENT_DB=$(grep '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | sed -E 's/^["'\''“”‘’]+|["'\''“”‘’]+$//g')
NEED_DERIVE=0
if ! echo "$CURRENT_DB" | grep -q 'babyeyi_wizard_db'; then
  NEED_DERIVE=1
elif echo "$CURRENT_DB" | grep -qE 'postgres:postgres@localhost:5432'; then
  NEED_DERIVE=1
fi
if [ "$NEED_DERIVE" = "1" ]; then
  for REF in \
    "$REPO/MiniWebsite/Backend/.env" \
    "$REPO/Library/Backend/.env" \
    "$AUTH_ENV"; do
    if [ -f "$REF" ]; then
      REF_URL=$(grep '^DATABASE_URL=' "$REF" | head -1 | cut -d= -f2- | sed -E 's/^["'\''“”‘’]+|["'\''“”‘’]+$//g')
      if echo "$REF_URL" | grep -qE '^postgres(ql)?://'; then
        NEW_URL=$(python3 - <<PY
import re
url = """$REF_URL"""
url = re.sub(r'/[^/?]+(\?|$)', r'/babyeyi_wizard_db\1', url, count=1)
if 'connection_limit=' not in url:
    url += ('&' if '?' in url else '?') + 'connection_limit=2'
print(url)
PY
)
        sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$NEW_URL|" .env
        echo "  DATABASE_URL → babyeyi_wizard_db (from $(basename "$(dirname "$(dirname "$REF")")"))"
        break
      fi
    fi
  done
fi

grep -q '^PORT=' .env && sed -i 's/^PORT=.*/PORT=4017/' .env || echo 'PORT=4017' >> .env

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
  grep -q '^IAM_API_URL=' .env \
    && sed -i 's|^IAM_API_URL=.*|IAM_API_URL=http://127.0.0.1:4001/api/v1|' .env \
    || echo 'IAM_API_URL=http://127.0.0.1:4001/api/v1' >> .env
  grep -q '^STUDENT_MANAGEMENT_API_URL=' .env \
    || echo 'STUDENT_MANAGEMENT_API_URL=http://127.0.0.1:4024/api' >> .env
  grep -q '^CORS_ORIGIN=' .env \
    && sed -i 's|^CORS_ORIGIN=.*|CORS_ORIGIN=https://babyeyi.shuleplus.rw,https://shuleplus.rw,https://app.shuleplus.rw|' .env \
    || echo 'CORS_ORIGIN=https://babyeyi.shuleplus.rw,https://shuleplus.rw,https://app.shuleplus.rw' >> .env
  grep -q '^VERIFY_PUBLIC_URL=' .env \
    && sed -i 's|^VERIFY_PUBLIC_URL=.*|VERIFY_PUBLIC_URL=https://babyeyi.shuleplus.rw/verify|' .env \
    || echo 'VERIFY_PUBLIC_URL=https://babyeyi.shuleplus.rw/verify' >> .env
fi

export DATABASE_URL="$(grep '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | sed -E 's/^["'\''“”‘’]+|["'\''“”‘’]+$//g')"
if [[ ! "$DATABASE_URL" =~ ^postgres ]]; then
  echo "ERROR: DATABASE_URL invalid: ${DATABASE_URL:0:48}…"
  exit 1
fi
DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|^postgres(ql)?://[^@]+@([^/:]+).*|\2|')
DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|^postgres(ql)?://[^@]+@[^:/]+:([0-9]+).*|\2|')
DB_NAME=$(echo "$DATABASE_URL" | sed -E 's|^postgres(ql)?://[^/]+/([^?]+).*|\2|')
[ -z "$DB_PORT" ] && DB_PORT=5432
echo "  target database: ${DB_NAME} @ ${DB_HOST}:${DB_PORT}"

PSQL_URL=$(strip_psql_url "$DATABASE_URL")
ADMIN_URL=$(strip_psql_url "$(echo "$DATABASE_URL" | sed -E 's|/[^/?]+(\?.*)?$|/postgres|')")

echo "== ensure database ${DB_NAME} exists =="
if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx shuleplus-iam-db \
  && echo "$PSQL_URL" | grep -qE '@(localhost|127\.0\.0\.1):5432'; then
  docker exec shuleplus-iam-db psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
    || docker exec shuleplus-iam-db psql -U postgres -c "CREATE DATABASE \"${DB_NAME}\";"
else
  psql "$ADMIN_URL" -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" 2>/dev/null | grep -q 1 \
    || psql "$ADMIN_URL" -c "CREATE DATABASE \"${DB_NAME}\";"
fi

echo "== prisma generate + migrate deploy + db push =="
npx prisma generate
if ! npx prisma migrate deploy; then
  echo "  WARN: migrate deploy failed — trying db push"
  npx prisma db push --accept-data-loss
else
  npx prisma db push --skip-generate 2>/dev/null || true
fi

# Verify tenants table exists (same DATABASE_URL as the API .env)
HAS_TENANTS=$(psql "$PSQL_URL" -tc \
  "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tenants' LIMIT 1" 2>/dev/null | tr -d '[:space:]' || true)
if [ "$HAS_TENANTS" != "1" ]; then
  echo "  tenants table not found — forcing prisma db push"
  npx prisma db push --accept-data-loss
  HAS_TENANTS=$(psql "$PSQL_URL" -tc \
    "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tenants' LIMIT 1" 2>/dev/null | tr -d '[:space:]' || true)
fi
if [ "$HAS_TENANTS" != "1" ]; then
  echo "ERROR: public.tenants missing in ${DB_NAME} @ ${DB_HOST}:${DB_PORT}"
  echo "  Run: cd $BDIR && npx prisma migrate deploy && npx prisma db push"
  exit 1
fi
TENANT_COUNT=$(psql "$PSQL_URL" -tc 'SELECT COUNT(*) FROM tenants' 2>/dev/null | tr -d '[:space:]' || echo "?")
echo "  ok: public.tenants exists (${TENANT_COUNT} rows)"

if [ "$PREPARE_ONLY" = true ]; then
  echo "fix-babyeyi-db: prepare complete"
  exit 0
fi

echo "== build + restart babyeyi-api on :4017 =="
grep -q '^PORT=' .env && sed -i 's/^PORT=.*/PORT=4017/' .env || echo 'PORT=4017' >> .env
npm run build >>"$LOG" 2>&1 || {
  echo "ERROR: npm run build failed — see $LOG"
  tail -n 40 "$LOG" || true
  exit 1
}
pm2 delete babyeyi-api >/dev/null 2>&1 || true
sleep 1
if [ -f dist/server.js ]; then
  pm2 start dist/server.js --name babyeyi-api --cwd "$BDIR" --env NODE_ENV=production
else
  pm2 start "npx tsx src/server.ts" --name babyeyi-api --interpreter none --cwd "$BDIR" \
    --env NODE_ENV=production
fi
pm2 save 2>/dev/null || true

echo ""
echo "== health check =="
sleep 3
if curl -sf --max-time 10 http://127.0.0.1:4017/api/health; then
  echo ""
else
  echo "ERROR: babyeyi-api not responding on :4017 — logs:"
  pm2 logs babyeyi-api --err --lines 25 --nostream 2>/dev/null || true
  exit 1
fi
