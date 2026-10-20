#!/bin/bash
# Diagnose Super Admin Gate Devices → auth-api → attendance-api path.
# Usage:
#   cd /root/apps/shuleplus/ShulePlus
#   bash scripts/diagnose-gate-devices-upstream.sh
#   bash scripts/diagnose-gate-devices-upstream.sh <organizationId>
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
ORG_ID="${1:-}"

cd "$REPO" || exit 1

AUTH_ENV="$REPO/Authentication/Backend/.env"
ATT_ENV="$REPO/Attendance/Backend/.env"

read_env() {
  local file="$1" key="$2"
  grep "^${key}=" "$file" 2>/dev/null | head -1 | cut -d= -f2- | sed -E 's/^["'\''“”‘’]+|["'\''“”‘’]+$//g'
}

AUTH_KEY=$(read_env "$AUTH_ENV" PLATFORM_SERVICE_KEY)
[ -z "$AUTH_KEY" ] && AUTH_KEY=$(read_env "$AUTH_ENV" MODULE_PROVISIONING_KEY)
ATT_KEY=$(read_env "$ATT_ENV" SERVICE_API_KEY)
ATT_URL=$(read_env "$AUTH_ENV" ATTENDANCE_API_URL)

echo "== Auth backend (gate devices path) =="
echo "  ATTENDANCE_API_URL=${ATT_URL:-<missing — run: bash scripts/redeploy-module.sh true Authentication auth-api>}"
echo "  PLATFORM_SERVICE_KEY prefix: ${AUTH_KEY:0:6}…"

echo ""
echo "== Attendance backend =="
echo "  SERVICE_API_KEY prefix: ${ATT_KEY:0:6}…"
if [ -n "$AUTH_KEY" ] && [ -n "$ATT_KEY" ] && [ "$AUTH_KEY" != "$ATT_KEY" ]; then
  echo "  WARNING: PLATFORM_SERVICE_KEY (auth) != SERVICE_API_KEY (attendance) — gate device calls will fail"
fi

echo ""
echo "== PM2 =="
pm2 describe auth-api 2>/dev/null | grep -E 'status|restarts|uptime' || echo "  auth-api not in pm2"
pm2 describe attendance-api 2>/dev/null | grep -E 'status|restarts|uptime' || echo "  attendance-api not in pm2"

echo ""
echo "== Loopback health =="
while read -r label port path; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "http://127.0.0.1:${port}${path}" || echo "000")
  echo "  ${label} (:${port}) → HTTP ${code}"
done <<'EOF'
auth-api 4001 /api/v1/health
attendance-api 4008 /api/health
EOF

if [ -z "$ATT_URL" ]; then
  echo ""
  echo "== FIX (ATTENDANCE_API_URL missing) =="
  echo "  echo 'ATTENDANCE_API_URL=http://localhost:4008/api' >> Authentication/Backend/.env"
  echo "  pm2 restart auth-api --update-env"
  echo "  — or: bash scripts/redeploy-module.sh true Authentication auth-api"
fi

if [ -n "$ATT_URL" ]; then
  echo ""
  echo "== Auth-configured ATTENDANCE_API_URL =="
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "${ATT_URL%/}/health" || echo "000")
  echo "  ${ATT_URL%/}/health → HTTP ${code}"
  if [ "$code" != "200" ]; then
    echo "  FIX: set ATTENDANCE_API_URL=http://localhost:4008/api in Authentication/Backend/.env"
    echo "       then: pm2 restart auth-api --update-env"
  fi
fi

if [ -z "$ORG_ID" ]; then
  ORG_ID=$(curl -s "http://127.0.0.1:4001/api/v1/internal/organizations" \
    -H "x-service-key: ${AUTH_KEY}" \
    -H "x-source-service: diagnose" 2>/dev/null \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print((d.get('data') or [{}])[0].get('id',''))" 2>/dev/null || true)
fi

if [ -z "$ORG_ID" ]; then
  echo ""
  echo "Pass organizationId (e.g. GS Camp Kigali) to test device provisioning:"
  echo "  bash scripts/diagnose-gate-devices-upstream.sh <organizationId>"
  exit 0
fi

echo ""
echo "== POST /service/devices (org=${ORG_ID}) =="
BASE="${ATT_URL:-http://localhost:4008/api}"
curl -sS --max-time 8 -X POST "${BASE%/}/service/devices?organizationId=${ORG_ID}" \
  -H "Content-Type: application/json" \
  -H "x-service-key: ${AUTH_KEY}" \
  -H "x-organization-id: ${ORG_ID}" \
  -H "x-source-service: diagnose" \
  -d "{\"organizationId\":\"${ORG_ID}\",\"deviceCode\":\"DIAG-$(date +%s)\",\"name\":\"Diag Gate\",\"location\":\"Test\"}" \
  | python3 - <<'PY'
import sys, json
raw = sys.stdin.read()
try:
    d = json.loads(raw) if raw.strip() else {}
except Exception as e:
    print(f"  INVALID JSON: {e}")
    print(raw[:500])
    raise SystemExit(0)
if d.get("success"):
    data = d.get("data") or {}
    print(f"  OK — device {data.get('deviceCode')} created (delete test device in Super Admin if needed)")
elif d.get("message"):
    print(f"  ERROR: {d['message']}")
else:
    print(f"  unexpected: {raw[:500]}")
PY
