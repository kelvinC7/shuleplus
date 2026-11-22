#!/bin/bash
# Ensure Transport PostgreSQL database + DATABASE_URL (fixes Prisma P1010 on production).
# Usage:
#   cd /root/apps/shuleplus/ShulePlus && bash scripts/fix-transport-db.sh
#   bash scripts/fix-transport-db.sh --prepare-only
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
BDIR="$REPO/Transport/Backend"
AUTH_ENV="$REPO/Authentication/Backend/.env"
DB_NAME="transport_db"
PREPARE_ONLY=false
[ "${1:-}" = "--prepare-only" ] && PREPARE_ONLY=true

cd "$REPO" || exit 1
[ -d "$BDIR" ] || { echo "ERROR: missing $BDIR"; exit 1; }
cd "$BDIR" || exit 1

[ -f .env ] || cp -n .env.example .env 2>/dev/null || true
[ -f .env ] || { echo "ERROR: missing $BDIR/.env"; exit 1; }

echo "== align DATABASE_URL + keys for Transport =="
CURRENT_DB=$(grep '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | sed -E 's/^["'\''“”‘’]+|["'\''“”‘’]+$//g')
if echo "$CURRENT_DB" | grep -qE 'postgres:postgres@|/transport_db'; then
  for REF in \
    "$REPO/ParentMIS/Backend/.env" \
    "$REPO/StudentManagement/Backend/.env" \
    "$REPO/Library/Backend/.env" \
    "$AUTH_ENV"; do
    if [ -f "$REF" ]; then
      REF_URL=$(grep '^DATABASE_URL=' "$REF" | head -1 | cut -d= -f2- | sed -E 's/^["'\''“”‘’]+|["'\''“”‘’]+$//g')
      if echo "$REF_URL" | grep -qE '^postgres(ql)?://'; then
        REF_URL="$REF_URL" TRANSPORT_DB_NAME="$DB_NAME" python3 - <<'PY'
import os
import re
from pathlib import Path

ref = os.environ["REF_URL"]
db = os.environ["TRANSPORT_DB_NAME"]
url = re.sub(r'/[^/?]+(\?|$)', rf'/{db}\1', ref, count=1)
if 'connection_limit=' not in url:
    url += ('&' if '?' in url else '?') + 'connection_limit=2'
p = Path(".env")
lines = p.read_text(encoding="utf-8", errors="replace").splitlines()
out, found = [], False
for line in lines:
    if line.startswith("DATABASE_URL="):
        out.append(f"DATABASE_URL={url}")
        found = True
    else:
        out.append(line)
if not found:
    out.append(f"DATABASE_URL={url}")
p.write_text("\n".join(out) + "\n", encoding="utf-8")
PY
        echo "  DATABASE_URL → $DB_NAME (from $(basename "$(dirname "$(dirname "$REF")")"))"
        break
      fi
    fi
  done
fi

grep -q '^PORT=' .env && sed -i 's/^PORT=.*/PORT=4034/' .env || echo 'PORT=4034' >> .env

AUTH_ENV="$AUTH_ENV" python3 - <<'PY'
import os
from pathlib import Path

def read_val(path: Path, key: str):
    if not path.exists():
        return None
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        if line.startswith(f"{key}="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None

def set_val(env_path: Path, key: str, val: str) -> None:
    lines = env_path.read_text(encoding="utf-8", errors="replace").splitlines() if env_path.exists() else []
    out, found = [], False
    for line in lines:
        if line.startswith(f"{key}="):
            out.append(f"{key}={val}")
            found = True
        else:
            out.append(line)
    if not found:
        out.append(f"{key}={val}")
    env_path.write_text("\n".join(out) + "\n", encoding="utf-8")

env = Path(".env")
auth = Path(os.environ["AUTH_ENV"])
jwt = read_val(auth, "JWT_ACCESS_SECRET")
key = read_val(auth, "MODULE_PROVISIONING_KEY") or read_val(auth, "PLATFORM_SERVICE_KEY")
if jwt:
    set_val(env, "JWT_ACCESS_SECRET", jwt)
if key:
    set_val(env, "SERVICE_API_KEY", key)
    set_val(env, "NOTIFICATION_SERVICE_API_KEY", key)
PY

export DATABASE_URL="$(grep '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | sed -E 's/^["'\''“”‘’]+|["'\''“”‘’]+$//g')"
if [[ ! "$DATABASE_URL" =~ ^postgres ]]; then
  echo "ERROR: DATABASE_URL invalid"
  exit 1
fi

echo "== ensure database ${DB_NAME} exists =="
node "$REPO/scripts/setup-module-databases.mjs" --only=Transport --skip-migrate 2>/dev/null || {
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx shuleplus-iam-db; then
    docker exec shuleplus-iam-db psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
      || docker exec shuleplus-iam-db psql -U postgres -c "CREATE DATABASE \"${DB_NAME}\";"
  else
    PGPASSWORD="${PGPASSWORD:-postgres}" psql -U postgres -h localhost -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
      || PGPASSWORD="${PGPASSWORD:-postgres}" psql -U postgres -h localhost -c "CREATE DATABASE \"${DB_NAME}\";"
  fi
}

echo "== grants on ${DB_NAME} =="
python3 - <<PY
import os, subprocess
from urllib.parse import urlparse, unquote

raw = os.environ.get("DATABASE_URL", "")
for proto in ("postgresql://", "postgres://"):
    if proto in raw:
        raw = raw[raw.index(proto) :]
        break
u = urlparse(raw.replace("postgresql://", "http://").replace("postgres://", "http://"))
user = unquote(u.username or "")
db = (u.path or "").lstrip("/").split("?")[0]
port = str(u.port or 5432)
host = u.hostname or "localhost"
if not user or not db:
    raise SystemExit("skip grants: could not parse DATABASE_URL")

def psql(sql, database="postgres"):
    env = {**os.environ, "PGPASSWORD": os.environ.get("PGPASSWORD", "postgres")}
    for cmd in (
        ["docker", "exec", "shuleplus-iam-db", "psql", "-U", "postgres", "-d", database, "-c", sql],
        ["psql", "-U", "postgres", "-h", host, "-p", port, "-d", database, "-c", sql],
    ):
        try:
            subprocess.run(cmd, check=True, capture_output=True, env=env)
            return
        except Exception:
            continue

if user != "postgres":
    psql(f'GRANT CONNECT ON DATABASE "{db}" TO "{user}";')
    psql(f'GRANT ALL PRIVILEGES ON DATABASE "{db}" TO "{user}";')
psql(f'GRANT ALL ON SCHEMA public TO "{user}";', db)
psql(f'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "{user}";', db)
print(f"  grants applied for {user} on {db}")
PY

echo "== prisma db push =="
npx prisma generate
npx prisma db push --accept-data-loss

if [ "$PREPARE_ONLY" = true ]; then
  echo "fix-transport-db: prepare complete"
  exit 0
fi

echo "== redeploy Transport =="
cd "$REPO" || exit 1
bash scripts/redeploy-module.sh Transport

echo ""
curl -sf "http://127.0.0.1:4034/api/health" && echo "" || echo "WARN: transport-api health check failed"
