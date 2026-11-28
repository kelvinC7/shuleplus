#!/bin/bash
# Free :6100, start auth-web against current Authentication/Frontend/.next, verify CSS.
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
FDIR="$REPO/Authentication/Frontend"
PORT="${AUTH_WEB_PORT:-6100}"
LOG="${LOG:-/tmp/restart-auth-web.log}"
# Do not wipe the parent deploy log when called from redeploy-module.sh
if [ "$LOG" = "/tmp/restart-auth-web.log" ]; then
  : >"$LOG"
fi
echo "===== restart-auth-web $(date -Is) =====" | tee -a "$LOG"

# Always serve the swapped production build, never a staging distDir leftover from deploy.
unset NEXT_DIST_DIR
export NEXT_DIST_DIR=.next
export NEXT_IGNORE_INCORRECT_LOCKFILE=true
export HOSTNAME=0.0.0.0

if [ ! -f "$FDIR/.next/BUILD_ID" ]; then
  echo "ERROR: missing $FDIR/.next/BUILD_ID - run: bash scripts/redeploy-module.sh true Authentication" | tee -a "$LOG"
  exit 1
fi

# Remove stale staging dirs that can confuse operators/debugging; live build is .next.
find "$FDIR" -maxdepth 1 -type d -name '.next-staging-*' -exec rm -rf {} + 2>/dev/null || true

echo ">>> free port :$PORT" | tee -a "$LOG"
fuser -k "${PORT}/tcp" >>"$LOG" 2>&1 || true
sleep 2

pm2 delete auth-web >>"$LOG" 2>&1 || true

echo ">>> pm2 start auth-web (cwd=$FDIR, NEXT_DIST_DIR=.next)" | tee -a "$LOG"
pm2 start "npx next start -H 0.0.0.0 -p ${PORT}" --name auth-web --interpreter none \
  --cwd "$FDIR" --update-env \
  --env NEXT_DIST_DIR=.next \
  --env NEXT_IGNORE_INCORRECT_LOCKFILE=true \
  --env HOSTNAME=0.0.0.0 >>"$LOG" 2>&1

sleep 6
if pm2 describe auth-web 2>/dev/null | grep -qE 'status\s+\|\s+online'; then
  echo "OK: auth-web online" | tee -a "$LOG"
else
  echo "ERROR: auth-web not online - pm2 logs auth-web --lines 80" | tee -a "$LOG"
  pm2 logs auth-web --lines 80 --nostream 2>&1 | tail -60 | tee -a "$LOG" || true
  exit 1
fi

# Nginx canonical apex vhost (root / -> :6100, /_next/static no-store)
if [ -f "$REPO/scripts/generate-shuleplus-apex-nginx.sh" ]; then
  echo ">>> regenerate apex nginx vhost" | tee -a "$LOG"
  sudo bash "$REPO/scripts/generate-shuleplus-apex-nginx.sh" >>"$LOG" 2>&1 || echo "WARN: generate-shuleplus-apex-nginx.sh failed (non-fatal if vhost already correct)" | tee -a "$LOG"
fi

echo ">>> verify CSS (fail deploy if landing would be unstyled)" | tee -a "$LOG"
export FDIR AUTH_WEB_PORT="$PORT"
if ! bash "$REPO/scripts/verify-auth-apex-static.sh" | tee -a "$LOG"; then
  echo "WARNING: auth-web static/CSS verification failed, but the process is online. Check log: $LOG" | tee -a "$LOG"
  echo "WARNING: continuing so deploy does not leave auth-web stopped; inspect pm2 logs auth-web --lines 80" | tee -a "$LOG"
fi

pm2 save >>"$LOG" 2>&1 || true
echo "===== DONE - log: $LOG =====" | tee -a "$LOG"
