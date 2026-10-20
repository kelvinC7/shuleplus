#!/bin/bash
# GitHub Actions entrypoint — sync repo and redeploy changed modules on the server.
# Invoked by .github/workflows/deploy.yml (self-hosted runner on production).
#
# Module flags are passed as CHANGED_<module>=true|false env vars from the workflow.
# Set FORCE_ALL=true to redeploy every module (workflow_dispatch force_all).
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
LOG="${LOG:-/tmp/deploy-changed.log}"
export REPO LOG
> "$LOG"

cd "$REPO" || exit 1
git fetch origin main
git checkout main
git stash push -u -m "ci-pre-pull-$(date +%s)" || true
git reset --hard origin/main
chmod +x scripts/*.sh

if [ "${CHANGED_SCRIPTS:-false}" = "true" ]; then
  bash scripts/generate-nginx-modules.sh || true
  bash scripts/ensure-shuleplus-tls.sh || true
  bash scripts/deploy-all-modules.sh
  node scripts/apply-module-subdomains.mjs || true
  pm2 restart auth-api --update-env || true
  if [ -f scripts/verify-babyeyi-host.sh ]; then
    chmod +x scripts/verify-babyeyi-host.sh scripts/fix-babyeyi-shuleplus.sh 2>/dev/null || true
    bash scripts/verify-babyeyi-host.sh --public >>"$LOG" 2>&1 \
      || bash scripts/fix-babyeyi-shuleplus.sh >>"$LOG" 2>&1 \
      || { echo "ERROR: babyeyi verify/fix failed — see $LOG"; exit 1; }
  fi
  pm2 save || true
  echo "Deploy finished (full scripts path). Log: $LOG"
  exit 0
fi

if [ "${CHANGED_AUTHENTICATION:-false}" = "true" ]; then
  bash scripts/redeploy-authentication.sh >>"$LOG" 2>&1 || exit 1
else
  bash scripts/redeploy-module.sh false Authentication auth-api auth-web >>"$LOG" 2>&1 || true
fi
bash scripts/redeploy-module.sh "${CHANGED_ACADEMIC:-false}" Academic academic-api academic-web
if [ "${CHANGED_ACADEMIC:-false}" = "true" ]; then
  # Academic redeploys have historically left academic-web on :6116 — free it immediately.
  pm2 delete academic-web >/dev/null 2>&1 || true
  fuser -k 6116/tcp 2>/dev/null || true
fi
bash scripts/redeploy-module.sh "${CHANGED_TEACHERPORTAL:-false}" TichaPortal ticha-api ticha-web
bash scripts/redeploy-module.sh "${CHANGED_SCHOOLFEESPORTAL:-false}" SchoolFeesPortal fees-api fees-web
bash scripts/redeploy-module.sh "${CHANGED_BUDGET:-false}" Budget budget-api budget-web
bash scripts/redeploy-module.sh "${CHANGED_PAYROLL:-false}" Payroll payroll-api payroll-web
bash scripts/redeploy-module.sh "${CHANGED_HR:-false}" HR hr-api hr-web
bash scripts/redeploy-module.sh "${CHANGED_ATTENDANCE:-false}" Attendance attendance-api attendance-web
bash scripts/redeploy-module.sh "${CHANGED_ACTIONPLANMIS:-false}" ActionPlanMIS action-plan-api action-plan-web
bash scripts/redeploy-module.sh "${CHANGED_PROCUREMENTMIS:-false}" ProcurementMIS procurement-api procurement-web
bash scripts/redeploy-module.sh "${CHANGED_INVENTORYMIS:-false}" InventoryMIS inventory-api inventory-web
bash scripts/redeploy-module.sh "${CHANGED_ASSETSPORTAL:-false}" AssetsPortal assets-api assets-web
bash scripts/redeploy-module.sh "${CHANGED_CAFETERIA:-false}" Cafeteria canteen-api canteen-web
bash scripts/redeploy-module.sh "${CHANGED_TIMETABLE:-false}" Timetable timetable-api timetable-web
bash scripts/redeploy-module.sh "${CHANGED_PARENTMIS:-false}" ParentMIS parents-api parents-web
bash scripts/redeploy-module.sh "${CHANGED_NESADASHBOARD:-false}" NesaDashboard nesa-api nesa-web
bash scripts/redeploy-module.sh "${CHANGED_BABYEYIWIZARD:-false}" BabyeyiWizard babyeyi-api babyeyi-web
bash scripts/redeploy-module.sh "${CHANGED_KAZIAVANCE:-false}" KaziAvance kazi-api kazi-web
bash scripts/redeploy-module.sh "${CHANGED_STUDENTDISCPLINE:-false}" StudentDiscpline discipline-api discipline-web
bash scripts/redeploy-module.sh "${CHANGED_SAMPLEMODULE:-false}" SampleModule demo-api demo-web
bash scripts/redeploy-module.sh "${CHANGED_SHULEKITMIS:-false}" ShuleKitMIS materials-api materials-web
bash scripts/redeploy-module.sh "${CHANGED_TASKMIS:-false}" TaskMIS tasks-api tasks-web
bash scripts/redeploy-module.sh "${CHANGED_SCHOOLUNIFORMMIS:-false}" SchoolUniformMIS uniform-api uniform-web
bash scripts/redeploy-module.sh "${CHANGED_LIBRARY:-false}" Library library-api library-web
bash scripts/redeploy-module.sh "${CHANGED_STUDENTMANAGEMENT:-false}" StudentManagement student-management-api student-management-web
bash scripts/redeploy-module.sh "${CHANGED_MINIWEBSITE:-false}" MiniWebsite mini-website-api mini-website-web

if [ "${CHANGED_WEBPAGEBABYEYI:-false}" = "true" ]; then
  bash scripts/deploy-babyeyi-rw.sh
fi

if [ "${CHANGED_SCHOOLUNIFORMMIS:-false}" = "true" ] \
  || [ "${CHANGED_LIBRARY:-false}" = "true" ] \
  || [ "${CHANGED_AUTHENTICATION:-false}" = "true" ] \
  || [ "${CHANGED_TEACHERPORTAL:-false}" = "true" ] \
  || [ "${CHANGED_WEBPAGEBABYEYI:-false}" = "true" ]; then
  node scripts/apply-module-subdomains.mjs || true
  pm2 restart auth-api --update-env || true
fi

# After any deploy: ensure babyeyi.shuleplus.rw is not serving Academic.
if [ -f scripts/verify-babyeyi-host.sh ]; then
  chmod +x scripts/verify-babyeyi-host.sh scripts/fix-babyeyi-shuleplus.sh 2>/dev/null || true
  if ! bash scripts/verify-babyeyi-host.sh --public >>"$LOG" 2>&1; then
    echo "babyeyi host serves Academic — auto-repairing..." | tee -a "$LOG"
    bash scripts/fix-babyeyi-shuleplus.sh >>"$LOG" 2>&1 \
      || { echo "ERROR: fix-babyeyi-shuleplus failed — see $LOG"; tail -n 40 "$LOG"; exit 1; }
  fi
fi

pm2 save
echo "Deploy finished. Log: $LOG"
