#!/bin/bash
# Fix babyeyi.shuleplus.rw serving the wrong app (often Academic on :6116).
#
# Usage (on production server):
#   cd ~/apps/shuleplus/ShulePlus
#   git pull origin main
#   bash scripts/fix-babyeyi-shuleplus.sh
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
LOG="${LOG:-/tmp/fix-babyeyi-shuleplus.log}"
FPORT=6116

cd "$REPO" || exit 1
: >"$LOG"
echo "===== fix-babyeyi-shuleplus $(date -Is) =====" | tee -a "$LOG"

# 0. Ensure babyeyi_wizard_db + tenants table (fixes "public.tenants does not exist")
if [ -f scripts/fix-babyeyi-db.sh ]; then
  bash scripts/fix-babyeyi-db.sh --prepare-only >>"$LOG" 2>&1 \
    || { echo "ERROR: fix-babyeyi-db failed — see $LOG"; tail -n 40 "$LOG"; exit 1; }
  echo "  babyeyi DB schema ok" | tee -a "$LOG"
fi

# 1. Ensure IAM catalog points babyeyi → babyeyi.shuleplus.rw (not academic)
AUTH_ENV="$REPO/Authentication/Backend/.env"
if [ -f "$AUTH_ENV" ]; then
  # Subshell — do not export DATABASE_URL into the shell (pm2 --update-env would poison auth-api).
  (
    export DATABASE_URL=$(grep '^DATABASE_URL=' "$AUTH_ENV" | head -1 | cut -d= -f2-)
    node "$REPO/scripts/apply-module-subdomains.mjs"
  ) >>"$LOG" 2>&1 \
    && echo "  catalog URLs applied" | tee -a "$LOG" \
    || echo "  WARN: apply-module-subdomains failed" | tee -a "$LOG"
fi

# 2. Free :6116 — Academic must never bind here (BabyeyiWizard port).
pm2 delete academic-web >/dev/null 2>&1 || true
fuser -k "${FPORT}/tcp" >>"$LOG" 2>&1 || true
sleep 1

# 3. Redeploy BabyeyiWizard (build + pm2 on :6116 with content check)
chmod +x scripts/redeploy-module.sh 2>/dev/null || true
bash scripts/redeploy-module.sh true BabyeyiWizard babyeyi-api babyeyi-web >>"$LOG" 2>&1 \
  || { echo "ERROR: BabyeyiWizard redeploy failed — see $LOG"; tail -n 40 "$LOG"; exit 1; }

# 3. Regenerate nginx — babyeyi.shuleplus.rw must proxy to :6116 (not Academic static root)
if [ -f scripts/generate-nginx-modules.sh ]; then
  sudo bash scripts/generate-nginx-modules.sh >>"$LOG" 2>&1 \
    && echo "  nginx configs regenerated" | tee -a "$LOG" \
    || echo "  WARN: nginx regenerate failed" | tee -a "$LOG"
fi

# 4. Verify local port + public host
sleep 2
chmod +x scripts/verify-babyeyi-host.sh 2>/dev/null || true
if ! bash scripts/verify-babyeyi-host.sh --public >>"$LOG" 2>&1; then
  echo "ERROR: babyeyi still serves Academic after fix — see $LOG" | tee -a "$LOG"
  tail -n 30 "$LOG" | tee -a "$LOG" || true
  exit 1
fi
echo "OK: babyeyi.shuleplus.rw serves BabyeyiWizard" | tee -a "$LOG"

pm2 save | tee -a "$LOG"
echo "===== DONE — log: $LOG ====="
echo "If shuleplus.rw / login is down, run: bash scripts/recover-core-services.sh"
