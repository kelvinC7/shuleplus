#!/bin/bash
# Repair Library PostgreSQL connection (P1010: User was denied access).
# Usage (on server):
#   cd /root/apps/shuleplus/ShulePlus && bash scripts/fix-library-db.sh
#   bash scripts/fix-library-db.sh --prepare-only   # DB + .env only (used by redeploy)
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
BDIR="$REPO/Library/Backend"
AUTH_ENV="$REPO/Authentication/Backend/.env"
PREPARE_ONLY=false
[ "${1:-}" = "--prepare-only" ] && PREPARE_ONLY=true

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
if echo "$CURRENT_DB" | grep -qE 'postgres:postgres@localhost:5432/library_module_db|/library_module_db'; then
  for REF in \
    "$REPO/AssetsPortal/Backend/.env" \
    "$REPO/HR/Backend/.env" \
    "$REPO/Payroll/Backend/.env" \
    "$REPO/StudentManagement/Backend/.env" \
    "$AUTH_ENV"; do
    if [ -f "$REF" ]; then
      REF_URL=$(grep '^DATABASE_URL=' "$REF" | head -1 | cut -d= -f2- | sed -E 's/^["'\''“”‘’]+|["'\''“”‘’]+$//g')
      if echo "$REF_URL" | grep -qE '^postgres(ql)?://'; then
        NEW_URL=$(python3 - <<PY
import re
url = """$REF_URL"""
url = re.sub(r'/[^/?]+(\?|$)', r'/library_module_db\1', url, count=1)
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

grep -q '^PORT=' .env && sed -i 's/^PORT=.*/PORT=4025/' .env || echo 'PORT=4025' >> .env

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
  grep -q '^CORS_ORIGIN=' .env && sed -i 's|^CORS_ORIGIN=.*|CORS_ORIGIN=https://library.shuleplus.rw,https://shuleplus.rw,https://app.shuleplus.rw|' .env \
    || echo 'CORS_ORIGIN=https://library.shuleplus.rw,https://shuleplus.rw,https://app.shuleplus.rw' >> .env
fi

export DATABASE_URL="$(grep '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | sed -E 's/^["'\''“”‘’]+|["'\''“”‘’]+$//g')"
if [[ ! "$DATABASE_URL" =~ ^postgres ]]; then
  echo "ERROR: DATABASE_URL invalid: ${DATABASE_URL:0:48}…"
  exit 1
fi

echo "== ensure database library_module_db exists =="
node "$REPO/scripts/setup-module-databases.mjs" --only=Library --skip-migrate 2>/dev/null || {
  DB_NAME="library_module_db"
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx shuleplus-iam-db; then
    docker exec shuleplus-iam-db psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
      || docker exec shuleplus-iam-db psql -U postgres -c "CREATE DATABASE \"${DB_NAME}\";"
  else
    PGPASSWORD="${PGPASSWORD:-postgres}" psql -U postgres -h localhost -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
      || PGPASSWORD="${PGPASSWORD:-postgres}" psql -U postgres -h localhost -c "CREATE DATABASE \"${DB_NAME}\";"
  fi
}

echo "== prisma generate + migrate =="
npx prisma generate
npx prisma migrate deploy || npx prisma db push --accept-data-loss

if [ "$PREPARE_ONLY" = true ]; then
  echo "fix-library-db: prepare complete"
  exit 0
fi

echo "== redeploy library-api =="
cd "$REPO" || exit 1
bash scripts/redeploy-module.sh true Library library-api library-web

echo ""
echo "== health check =="
curl -s http://127.0.0.1:4025/api/health || true
echo ""
