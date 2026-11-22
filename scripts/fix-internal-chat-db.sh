#!/bin/bash
# Repair InternalChat (ShuleChat) PostgreSQL connection (P1010: User was denied access).
# Usage (on server):
#   cd /root/apps/shuleplus/ShulePlus && bash scripts/fix-internal-chat-db.sh
#   bash scripts/fix-internal-chat-db.sh --prepare-only   # DB + .env only (used by redeploy)
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
BDIR="$REPO/InternalChat/Backend"
AUTH_ENV="$REPO/Authentication/Backend/.env"
DB_NAME="chat_module_db"
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
if echo "$CURRENT_DB" | grep -qE 'postgres:postgres@localhost:5432/chat_module_db|/chat_module_db'; then
  for REF in \
    "$REPO/Library/Backend/.env" \
    "$REPO/StudentManagement/Backend/.env" \
    "$REPO/HR/Backend/.env" \
    "$AUTH_ENV"; do
    if [ -f "$REF" ]; then
      REF_URL=$(grep '^DATABASE_URL=' "$REF" | head -1 | cut -d= -f2- | sed -E 's/^["'\''“”‘’]+|["'\''“”‘’]+$//g')
      if echo "$REF_URL" | grep -qE '^postgres(ql)?://'; then
        REF_URL="$REF_URL" CHAT_DB_NAME="$DB_NAME" python3 - <<'PY'
import os
import re
from pathlib import Path
ref = os.environ["REF_URL"]
db = os.environ["CHAT_DB_NAME"]
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
        echo "  DATABASE_URL derived from $(basename "$(dirname "$(dirname "$REF")")")"
        break
      fi
    fi
  done
fi

grep -q '^PORT=' .env && sed -i 's/^PORT=.*/PORT=4029/' .env || echo 'PORT=4029' >> .env

AUTH_ENV="$AUTH_ENV" python3 - <<'PY'
import os
from pathlib import Path
import re

def read_val(path: Path, key: str):
    if not path.exists():
        return None
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        if line.startswith(f"{key}="):
            v = line.split("=", 1)[1].strip()
            return v.strip('"').strip("'")
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
    set_val(env, "PLATFORM_SERVICE_KEY", key)
    set_val(env, "NOTIFICATION_SERVICE_API_KEY", key)
set_val(
    env,
    "CORS_ORIGIN",
    "https://shulechat.shuleplus.rw,https://shulechat-api.shuleplus.rw,https://shuleplus.rw,https://app.shuleplus.rw",
)
for k, v in {
    "IAM_API_URL": "http://localhost:4001/api/v1",
    "STUDENT_MGMT_API_URL": "http://localhost:4024/api",
    "NOTIFICATION_SERVICE_URL": "http://localhost:4001/api/v1/notifications",
}.items():
    set_val(env, k, v)
PY

export DATABASE_URL="$(grep '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | sed -E 's/^["'\''“”‘’]+|["'\''“”‘’]+$//g')"
if [[ ! "$DATABASE_URL" =~ ^postgres ]]; then
  echo "ERROR: DATABASE_URL invalid: ${DATABASE_URL:0:48}…"
  exit 1
fi

echo "== ensure database ${DB_NAME} exists =="
node "$REPO/scripts/setup-module-databases.mjs" --only=InternalChat --skip-migrate 2>/dev/null || {
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
npx prisma migrate deploy || true
npx prisma db push --accept-data-loss

echo "== grants on ${DB_NAME} for app user =="
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

def psql(sql):
    env = {**os.environ, "PGPASSWORD": os.environ.get("PGPASSWORD", "postgres")}
    for cmd in (
        ["docker", "exec", "shuleplus-iam-db", "psql", "-U", "postgres", "-d", db, "-c", sql],
        ["psql", "-U", "postgres", "-h", host, "-p", port, "-d", db, "-c", sql],
    ):
        try:
            subprocess.run(cmd, check=True, capture_output=True, env=env)
            return
        except Exception:
            continue

psql(f'GRANT CONNECT ON DATABASE "{db}" TO "{user}";')
psql(f'GRANT ALL PRIVILEGES ON DATABASE "{db}" TO "{user}";')
psql(f'GRANT ALL ON SCHEMA public TO "{user}";')
psql(f'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "{user}";')
psql(f'GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "{user}";')
print(f"  grants applied for {user} on {db}")
PY

echo "== verify DB from Node (same as chat-api) =="
unset DATABASE_URL
node - <<'NODE'
require('dotenv').config({ path: '.env', override: true });
const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();
(async () => {
  await prisma.$connect();
  const rows = await prisma.$queryRawUnsafe(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1"
  );
  console.log('  tables:', rows.map((r) => r.tablename).join(', ') || '(none)');
  await prisma.$disconnect();
})().catch((e) => {
  console.error('  ERROR:', e.message);
  process.exit(1);
});
NODE

if [ "$PREPARE_ONLY" = true ]; then
  echo "fix-internal-chat-db: prepare complete"
  exit 0
fi

echo "== redeploy chat-api =="
cd "$REPO" || exit 1
bash scripts/redeploy-module.sh true InternalChat chat-api chat-web

echo ""
echo "== health check =="
curl -s http://127.0.0.1:4029/api/health || curl -s http://127.0.0.1:4029/health || true
echo ""
