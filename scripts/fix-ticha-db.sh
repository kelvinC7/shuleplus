#!/bin/bash
# Ensure TichaPortal has a PostgreSQL database for Round Roll Call.
#
# Round Roll Call used to persist into src/data/db.json, which is tracked in git
# and therefore restored by `git reset --hard` on every deploy. This script makes
# sure DATABASE_URL points at a real database outside the repository.
#
# Usage (on server):
#   cd /root/apps/shuleplus/ShulePlus && bash scripts/fix-ticha-db.sh
#   bash scripts/fix-ticha-db.sh --prepare-only   # DB + .env only (used by redeploy)
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
BDIR="$REPO/TichaPortal/backend"
DB_NAME="ticha_portal_db"
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

echo "== sanitize DATABASE_URL =="
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
NEED_DB_URL=false
[ -z "$CURRENT_DB" ] && NEED_DB_URL=true
echo "$CURRENT_DB" | grep -qE '^postgres(ql)?://' || NEED_DB_URL=true
echo "$CURRENT_DB" | grep -qE '/ticha_portal_db' && NEED_DB_URL=true
if [ "$NEED_DB_URL" = true ]; then
  for REF in \
    "$REPO/Authentication/Backend/.env" \
    "$REPO/HR/Backend/.env" \
    "$REPO/StudentManagement/Backend/.env" \
    "$REPO/Academic/Backend/.env" \
    "$REPO/Library/Backend/.env"; do
    if [ -f "$REF" ]; then
      REF_URL=$(grep '^DATABASE_URL=' "$REF" | head -1 | cut -d= -f2- | sed -E 's/^["'\''“”‘’]+|["'\''“”‘’]+$//g')
      if echo "$REF_URL" | grep -qE '^postgres(ql)?://'; then
        NEW_URL=$(REF_URL="$REF_URL" DB_NAME="$DB_NAME" python3 - <<'PY'
import os
import re
url = os.environ["REF_URL"]
db = os.environ["DB_NAME"]
url = re.sub(r'/[^/?]+(\?|$)', rf'/{db}\1', url, count=1)
if 'connection_limit=' not in url:
    url += ('&' if '?' in url else '?') + 'connection_limit=2'
print(url)
PY
)
        if grep -q '^DATABASE_URL=' .env; then
          sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$NEW_URL|" .env
        else
          echo "DATABASE_URL=$NEW_URL" >> .env
        fi
        echo "  DATABASE_URL derived from $(basename "$(dirname "$(dirname "$REF")")")"
        break
      fi
    fi
  done
fi

grep -q '^PORT=' .env && sed -i 's/^PORT=.*/PORT=4003/' .env || echo 'PORT=4003' >> .env

export DATABASE_URL="$(grep '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | sed -E 's/^["'\''“”‘’]+|["'\''“”‘’]+$//g')"
if [[ ! "$DATABASE_URL" =~ ^postgres ]]; then
  echo "ERROR: DATABASE_URL invalid or missing: ${DATABASE_URL:0:48}…"
  echo "       Copy a working postgres URL from Authentication/Backend/.env"
  exit 1
fi

echo "== ensure database ${DB_NAME} exists =="
if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx shuleplus-iam-db; then
  docker exec shuleplus-iam-db psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
    || docker exec shuleplus-iam-db psql -U postgres -c "CREATE DATABASE \"${DB_NAME}\";"
else
  psql "$DATABASE_URL" -tc "SELECT 1" >/dev/null 2>&1 || {
    echo "ERROR: cannot connect with DATABASE_URL — copy a working URL from Authentication/Backend/.env"
    exit 1
  }
  psql "$DATABASE_URL" -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
    || psql "$(DATABASE_URL="$DATABASE_URL" python3 - <<'PY'
import os
from urllib.parse import urlparse
u = urlparse(os.environ["DATABASE_URL"].replace("postgresql://", "http://", 1))
print(f"postgresql://{u.username}:{u.password}@{u.hostname}:{u.port or 5432}/postgres")
PY
)" -c "CREATE DATABASE \"${DB_NAME}\";"
fi

if [ "$PREPARE_ONLY" = true ]; then
  echo "fix-ticha-db: prepare complete"
  exit 0
fi

echo "== prisma generate + migrate =="
if [ ! -d node_modules/prisma ]; then
  npm install
fi
npx prisma generate
npx prisma migrate deploy || npx prisma db push --skip-generate --accept-data-loss

echo "== redeploy ticha-api + ticha-web =="
cd "$REPO" || exit 1
bash scripts/redeploy-module.sh true TichaPortal ticha-api ticha-web

echo ""
echo "== health check =="
curl -s http://127.0.0.1:4003/api/health || true
echo ""
