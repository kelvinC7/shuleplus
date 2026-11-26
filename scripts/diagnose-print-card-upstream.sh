#!/bin/bash
# Test Print Card → Student Management / HR / IAM connectivity on the server.
# Usage:
#   cd /root/apps/shuleplus/ShulePlus
#   bash scripts/diagnose-print-card-upstream.sh
#   bash scripts/diagnose-print-card-upstream.sh <organizationId>
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
ORG_ID="${1:-}"

cd "$REPO" || exit 1

AUTH_ENV="$REPO/Authentication/Backend/.env"
PC_ENV="$REPO/PrintCardMIS/Backend/.env"
SM_ENV="$REPO/StudentManagement/Backend/.env"

read_env() {
  local file="$1" key="$2"
  grep "^${key}=" "$file" 2>/dev/null | head -1 | cut -d= -f2- | sed -E 's/^["'\''“”‘’]+|["'\''“”‘’]+$//g'
}

if [ ! -f "$PC_ENV" ]; then
  echo "ERROR: missing $PC_ENV"
  exit 1
fi

AUTH_KEY=$(read_env "$AUTH_ENV" PLATFORM_SERVICE_KEY)
[ -z "$AUTH_KEY" ] && AUTH_KEY=$(read_env "$AUTH_ENV" MODULE_PROVISIONING_KEY)
PC_KEY=$(read_env "$PC_ENV" SERVICE_API_KEY)
SM_URL=$(read_env "$PC_ENV" STUDENT_MANAGEMENT_API_URL)
HR_URL=$(read_env "$PC_ENV" HR_API_URL)
IAM_URL=$(read_env "$PC_ENV" IAM_API_URL)
AUTH_SM_URL=$(read_env "$AUTH_ENV" STUDENT_MANAGEMENT_API_URL)

echo "== Print Card backend env =="
echo "  STUDENT_MANAGEMENT_API_URL=${SM_URL:-<missing>}"
echo "  HR_API_URL=${HR_URL:-<missing>}"
echo "  IAM_API_URL=${IAM_URL:-<missing>}"
echo "  SERVICE_API_KEY prefix: ${PC_KEY:0:6}…"

echo ""
echo "== Auth backend (Super Admin smart-access path) =="
echo "  STUDENT_MANAGEMENT_API_URL=${AUTH_SM_URL:-<missing — run: bash scripts/redeploy-module.sh false Authentication auth-api>}"

echo ""
echo "== Service health =="
while read -r label port path; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "http://127.0.0.1:${port}${path}" || echo "000")
  echo "  ${label} (:${port}) → HTTP ${code}"
done <<'EOF'
student-management-api 4024 /api/health
hr-api 4007 /api/health
auth-api 4001 /api/v1/health
print-card-api 4028 /api/health
EOF

if [ -z "$ORG_ID" ]; then
  ORG_ID=$(curl -s "http://127.0.0.1:4001/api/v1/internal/organizations" \
    -H "x-service-key: ${AUTH_KEY}" \
    -H "x-source-service: diagnose" 2>/dev/null \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print((d.get('data') or [{}])[0].get('id',''))" 2>/dev/null || true)
fi

if [ -z "$ORG_ID" ]; then
  echo ""
  echo "Pass an organizationId to test Student Management /service/students:"
  echo "  bash scripts/diagnose-print-card-upstream.sh <organizationId>"
  exit 0
fi

echo ""
echo "== Student Management /service/students (org=${ORG_ID}) =="
SM_BASE="${SM_URL:-http://localhost:4024/api}"
curl -sS --max-time 8 \
  "${SM_BASE%/}/service/students?organizationId=${ORG_ID}&status=ACTIVE" \
  -H "x-service-key: ${AUTH_KEY}" \
  -H "x-organization-id: ${ORG_ID}" \
  -H "x-source-service: diagnose" \
  | python3 - <<'PY'
import sys, json
try:
    raw = sys.stdin.read()
    d = json.loads(raw) if raw.strip() else {}
except Exception as e:
    print(f"  INVALID JSON: {e}")
    print(raw[:400])
    sys.exit(0)
if not d.get("success", True) and d.get("message"):
    print(f"  ERROR: {d['message']}")
elif "data" in d:
    n = len(d["data"]) if isinstance(d["data"], list) else 0
    print(f"  OK — {n} active student(s)")
    if n and isinstance(d["data"], list):
        s = d["data"][0]
        print(f"  sample: {s.get('fullName')} ({s.get('studentCode')})")
else:
    print(f"  unexpected: {raw[:400]}")
PY

echo ""
echo "== HR /internal/staff (org=${ORG_ID}) =="
HR_BASE="${HR_URL:-http://localhost:4007/api}"
curl -sS --max-time 8 \
  "${HR_BASE%/}/internal/staff?organizationId=${ORG_ID}" \
  -H "x-service-key: ${AUTH_KEY}" \
  -H "x-organization-id: ${ORG_ID}" \
  -H "x-source-service: diagnose" \
  | python3 - <<'PY'
import sys, json
raw = sys.stdin.read()
try:
    d = json.loads(raw) if raw.strip() else {}
except Exception:
    print(f"  raw: {raw[:300]}")
    sys.exit(0)
if isinstance(d.get("data"), list):
    print(f"  OK — {len(d['data'])} staff row(s)")
elif d.get("message"):
    print(f"  ERROR: {d['message']}")
else:
    print(f"  raw: {raw[:300]}")
PY

echo ""
echo "== IAM Users & Access /staff-for-cards (org=${ORG_ID}) =="
IAM_BASE="${IAM_URL:-http://localhost:4001/api/v1}"
code=$(curl -s -o /tmp/pc-iam-staff.json -w '%{http_code}' --max-time 8 \
  "${IAM_BASE%/}/internal/organizations/${ORG_ID}/staff-for-cards" \
  -H "x-service-key: ${AUTH_KEY}" \
  -H "x-source-service: diagnose" || echo "000")
echo "  HTTP ${code}"
python3 -c "import json; d=json.load(open('/tmp/pc-iam-staff.json')); print(f\"  OK — {len(d.get('data') or [])} IAM user(s)\")" 2>/dev/null \
  || echo "  (see /tmp/pc-iam-staff.json)"

echo ""
echo "== Timetable /internal/staff (org=${ORG_ID}) =="
TT_BASE=$(read_env "$PC_ENV" TIMETABLE_API_URL)
TT_BASE="${TT_BASE:-http://localhost:4014/api}"
code=$(curl -s -o /tmp/pc-tt-staff.json -w '%{http_code}' --max-time 8 \
  "${TT_BASE%/}/internal/staff?organizationId=${ORG_ID}" \
  -H "x-service-key: ${AUTH_KEY}" \
  -H "x-organization-id: ${ORG_ID}" \
  -H "x-source-service: diagnose" || echo "000")
echo "  HTTP ${code}"
python3 -c "import json; d=json.load(open('/tmp/pc-tt-staff.json')); print(f\"  OK — {len(d.get('data') or [])} timetable staff row(s)\")" 2>/dev/null \
  || echo "  (see /tmp/pc-tt-staff.json)"

echo ""
echo "Staff cards merge HR + IAM Users & Access + Timetable (dedupe by email)."
echo "If Student Management returns 'Tenant not provisioned', provision the org in SM first."
echo "If HTTP 401, align SERVICE_API_KEY with IAM PLATFORM_SERVICE_KEY and restart both APIs."
