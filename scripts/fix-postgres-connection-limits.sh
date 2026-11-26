#!/bin/bash
# Cap Prisma DATABASE_URL pool size for every ShulePlus module, then restart ShulePlus APIs.
# Run on server when you see: FATAL: sorry, too many clients already
#
# Usage:
#   cd /root/apps/shuleplus/ShulePlus && bash scripts/fix-postgres-connection-limits.sh
# Optional:
#   CONNECTION_LIMIT=2 bash scripts/fix-postgres-connection-limits.sh
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
LIMIT="${CONNECTION_LIMIT:-2}"
PG_PORT="${PG_PORT:-5433}"

# Fallback when PM2 cwd detection fails (happened on mopas-srv-01)
SHULEPLUS_APIS=(
  auth-api academic-api teachers-api fees-api budget-api payroll-api hr-api
  attendance-api action-plan-api procurement-api inventory-api assets-api
  canteen-api timetable-api parents-api nesa-api babyeyi-api kazi-api
  discipline-api demo-api materials-api tasks-api uniform-api
  student-management-api mini-website-api
)

cd "$REPO" || exit 1

pg_stat() {
  sudo -u postgres psql -p "$PG_PORT" -c "$1" 2>/dev/null || echo "(psql failed — Postgres still saturated)"
}

echo "== Postgres usage (port $PG_PORT) =="
pg_stat "SHOW max_connections;"
pg_stat "SELECT count(*) AS active_connections FROM pg_stat_activity;"

echo "== patch DATABASE_URL → connection_limit=$LIMIT in all ShulePlus Backend/.env =="
python3 - <<PY
import re
from pathlib import Path

repo = Path("$REPO")
limit = "$LIMIT"
changed = []

for env_path in sorted(repo.glob("*/Backend/.env")):
    lines = env_path.read_text(encoding="utf-8", errors="replace").splitlines()
    out = []
    file_changed = False
    for line in lines:
        if not line.lstrip().startswith("DATABASE_URL="):
            out.append(line)
            continue
        key, _, raw = line.partition("=")
        v = raw.strip().strip("\"'\`“”‘’")
        if not v.startswith("postgres"):
            out.append(line)
            continue
        if re.search(r"connection_limit=", v, re.I):
            new_v = re.sub(r"connection_limit=\d+", f"connection_limit={limit}", v, flags=re.I)
        else:
            new_v = f"{v}{'&' if '?' in v else '?'}connection_limit={limit}"
        new_line = f"{key}={new_v}"
        file_changed = file_changed or new_line != line.strip()
        out.append(new_line)
    if file_changed:
        env_path.write_text("\n".join(out) + "\n", encoding="utf-8")
        changed.append(str(env_path.relative_to(repo)))

if changed:
    print(f"Patched {len(changed)} file(s):")
    for p in changed:
        print(f"  - {p}")
else:
    print("All DATABASE_URL values already have connection_limit set.")
PY

discover_shuleplus_apis() {
  pm2 jlist 2>/dev/null | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)
for proc in data:
    name = proc.get('name') or ''
    cwd = (proc.get('pm2_env') or {}).get('pm_cwd') or ''
    cwd = cwd.replace('\\\\', '/').lower()
    if 'shuleplus' in cwd and name.endswith('-api'):
        print(name)
" 2>/dev/null
}

echo "== discover ShulePlus *-api PM2 processes =="
mapfile -t APIS < <(discover_shuleplus_apis)

if [ "${#APIS[@]}" -eq 0 ]; then
  echo "PM2 cwd scan found nothing — using known ShulePlus API list."
  APIS=()
  for name in "${SHULEPLUS_APIS[@]}"; do
    if pm2 describe "$name" >/dev/null 2>&1; then
      APIS+=("$name")
    fi
  done
fi

if [ "${#APIS[@]}" -eq 0 ]; then
  echo "ERROR: No ShulePlus API processes found. Run: pm2 list"
  exit 1
fi

echo "Found ${#APIS[@]} API(s): ${APIS[*]}"

echo "== stop APIs (release Postgres connections) =="
pm2 stop "${APIS[@]}" || true
sleep 4

echo "== Postgres after stop =="
pg_stat "SELECT count(*) AS active_connections FROM pg_stat_activity;"

echo "== start APIs with updated .env =="
pm2 start "${APIS[@]}" --update-env || pm2 restart "${APIS[@]}" --update-env
pm2 save >/dev/null 2>&1 || true
sleep 3

echo "== Postgres after restart =="
pg_stat "SELECT count(*) AS active_connections FROM pg_stat_activity;"
pg_stat "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname ORDER BY count DESC LIMIT 15;"

echo "== babyeyi health =="
curl -sS -m 8 http://127.0.0.1:4017/api/health || echo "babyeyi health failed"
echo
echo "Done. Hard-refresh https://babyeyi.shuleplus.rw/dashboard"
echo "If psql still fails, stop other Postgres PM2 apps (travooz, mtms, resort_ms, etc.) then re-run."
