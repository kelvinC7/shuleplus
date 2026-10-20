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

if [ ! -f "$FDIR/.next/BUILD_ID" ]; then
  echo "ERROR: missing $FDIR/.next/BUILD_ID — run: bash scripts/redeploy-module.sh true Authentication" | tee -a "$LOG"
  exit 1
fi

echo ">>> free port :$PORT" | tee -a "$LOG"
fuser -k "${PORT}/tcp" >>"$LOG" 2>&1 || true
sleep 2

pm2 delete auth-web >>"$LOG" 2>&1 || true

echo ">>> pm2 start auth-web" | tee -a "$LOG"
pm2 start "npx next start -H 0.0.0.0 -p ${PORT}" --name auth-web --interpreter none \
  --cwd "$FDIR" --update-env \
  --env NEXT_IGNORE_INCORRECT_LOCKFILE=true --env HOSTNAME=0.0.0.0 >>"$LOG" 2>&1

sleep 6
if pm2 describe auth-web 2>/dev/null | grep -qE 'status\s+│\s+online'; then
  echo "OK: auth-web online" | tee -a "$LOG"
else
  echo "ERROR: auth-web not online — pm2 logs auth-web --err --lines 40" | tee -a "$LOG"
  pm2 logs auth-web --err --lines 40 --nostream 2>&1 | tee -a "$LOG" || true
  exit 1
fi

if [ -f "$REPO/scripts/generate-shuleplus-apex-nginx.sh" ]; then
  sudo bash "$REPO/scripts/generate-shuleplus-apex-nginx.sh" >>"$LOG" 2>&1 || true
fi

export FDIR AUTH_WEB_PORT="$PORT"
bash "$REPO/scripts/verify-auth-apex-static.sh" | tee -a "$LOG"

pm2 save >>"$LOG" 2>&1 || true
echo "===== DONE — log: $LOG ====="
