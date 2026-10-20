#!/bin/bash
# Fix production Access Denied across ALL ShulePlus modules:
#  - /etc/hosts hairpin for *-api.shuleplus.rw → 127.0.0.1
#  - Sync JWT + service keys from Auth to every module backend
#  - Set CORS_ORIGIN to each module UI host (+ apex)
#  - Rebuild + restart every known module (API + FE)
#
# Usage (on server):
#   cd /root/apps/shuleplus/ShulePlus
#   git pull --ff-only origin main
#   bash scripts/fix-production-access.sh
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
LOG="${LOG:-/tmp/fix-production-access.log}"
cd "$REPO" || exit 1

: >"$LOG"
echo "===== fix-production-access $(date -Is) =====" | tee -a "$LOG"

AUTH_ENV="$REPO/Authentication/Backend/.env"
if [ ! -f "$AUTH_ENV" ]; then
  echo "ERROR: missing $AUTH_ENV" | tee -a "$LOG"
  exit 1
fi

AUTH_JWT=$(grep '^JWT_ACCESS_SECRET=' "$AUTH_ENV" | head -1 | cut -d= -f2-)
AUTH_KEY=$(grep -E '^(MODULE_PROVISIONING_KEY|PLATFORM_SERVICE_KEY)=' "$AUTH_ENV" | head -1 | cut -d= -f2-)
if [ -z "$AUTH_JWT" ]; then
  echo "ERROR: Auth JWT_ACCESS_SECRET missing" | tee -a "$LOG"
  exit 1
fi

# Auth must be production for catalog URLs during provision
if grep -q '^NODE_ENV=' "$AUTH_ENV"; then
  sed -i 's|^NODE_ENV=.*|NODE_ENV=production|' "$AUTH_ENV"
else
  echo 'NODE_ENV=production' >>"$AUTH_ENV"
fi

# Hairpin: server cannot reach public IP:443 for its own hosts
API_HOSTS=(
  academic-api teachers-api ticha-api fees-api finance-api budget-api payroll-api hr-api
  attendance-api action-plan-api procurement-api inventory-api assets-api
  canteen-api timetable-api parents-api nesa-api babyeyi-api kazi-api
  tasks-api discipline-api demo-api materials-api leave-api library-api
  website-api dashboard-api circulars-api transport-api
)
for h in "${API_HOSTS[@]}"; do
  host="${h}.shuleplus.rw"
  if ! grep -qE "[[:space:]]${host}([[:space:]]|$)" /etc/hosts; then
    echo "127.0.0.1 ${host}" >>/etc/hosts
    echo "  hosts + ${host}" | tee -a "$LOG"
  fi
done

# Redeploy map: ModuleDir pm_backend pm_frontend
MODULES=(
  "Authentication auth-api auth-web"
  "Academic academic-api academic-web"
  "TichaPortal ticha-api ticha-web"
  "SchoolFeesPortal fees-api fees-web"
  "Budget budget-api budget-web"
  "Payroll payroll-api payroll-web"
  "HR hr-api hr-web"
  "Attendance attendance-api attendance-web"
  "ActionPlanMIS action-plan-api action-plan-web"
  "ProcurementMIS procurement-api procurement-web"
  "InventoryMIS inventory-api inventory-web"
  "AssetsPortal assets-api assets-web"
  "Cafeteria canteen-api canteen-web"
  "Timetable timetable-api timetable-web"
  "ParentMIS parents-api parents-web"
  "NesaDashboard nesa-api nesa-web"
  "BabyeyiWizard babyeyi-api babyeyi-web"
  "KaziAvance kazi-api kazi-web"
  "StudentDiscpline discipline-api discipline-web"
  "SampleModule demo-api demo-web"
  "ShuleKitMIS materials-api materials-web"
  "TaskMIS tasks-api tasks-web"
  "SchoolUniformMIS uniform-api uniform-web"
  "MiniWebsite mini-website-api mini-website-web"
)

chmod +x scripts/redeploy-module.sh 2>/dev/null || true

for row in "${MODULES[@]}"; do
  # shellcheck disable=SC2086
  set -- $row
  MOD="$1"
  PMB="$2"
  PMF="$3"
  echo "" | tee -a "$LOG"
  echo ">>> $MOD" | tee -a "$LOG"
  bash scripts/redeploy-module.sh true "$MOD" "$PMB" "$PMF" || {
    echo "  WARN: redeploy failed for $MOD (see $LOG /tmp/deploy-changed.log)" | tee -a "$LOG"
  }
done

# Catalog public URLs (browsers) — provision uses loopback in Auth code
# Do not source full .env (SMTP_FROM=<...> breaks bash).
if [ -f "$AUTH_ENV" ]; then
  DATABASE_URL=$(grep '^DATABASE_URL=' "$AUTH_ENV" | head -1 | cut -d= -f2-)
  export DATABASE_URL
  node "$REPO/scripts/apply-module-subdomains.mjs" >>"$LOG" 2>&1 \
    && echo "  catalog URLs applied" | tee -a "$LOG" \
    || echo "  WARN: apply-module-subdomains failed" | tee -a "$LOG"
fi

pm2 restart auth-api --update-env >/dev/null 2>&1 || true
pm2 save | tee -a "$LOG"

echo "" | tee -a "$LOG"
echo "===== DONE =====" | tee -a "$LOG"
echo "Open modules from Organization Dashboard (with ?token=), not bare URLs."
echo "Then Super Admin → Re-provision / Repair all for failed tenants."
echo "Log: $LOG"
