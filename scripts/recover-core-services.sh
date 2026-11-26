#!/bin/bash
# Restore Authentication (IAM) when apex / login is down after a partial deploy or babyeyi fix.
#
# Usage (on production server):
#   cd ~/apps/shuleplus/ShulePlus
#   git pull origin main
#   bash scripts/recover-core-services.sh
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
LOG="${LOG:-/tmp/recover-core-services.log}"

cd "$REPO" || exit 1
: >"$LOG"
echo "===== recover-core-services $(date -Is) =====" | tee -a "$LOG"

chmod +x scripts/redeploy-module.sh scripts/restart-auth-web.sh scripts/patch-apex-uploads-nginx.sh scripts/generate-shuleplus-apex-nginx.sh scripts/verify-auth-apex-static.sh 2>/dev/null || true

echo ">>> prisma generate (Authentication)" | tee -a "$LOG"
if [ -d "$REPO/Authentication/Backend" ]; then
  (cd "$REPO/Authentication/Backend" && npx prisma generate) >>"$LOG" 2>&1 \
    || { echo "ERROR: prisma generate failed — see $LOG"; tail -n 40 "$LOG"; exit 1; }
fi

echo ">>> Redeploy Authentication (auth-api :4001, auth-web :6100)" | tee -a "$LOG"
if ! bash scripts/redeploy-authentication.sh >>"$LOG" 2>&1; then
  echo "ERROR: redeploy-authentication failed — see $LOG" | tee -a "$LOG"
  tail -n 50 "$LOG" || true
  exit 1
fi

if [ -f scripts/generate-shuleplus-apex-nginx.sh ]; then
  sudo bash scripts/generate-shuleplus-apex-nginx.sh >>"$LOG" 2>&1 || true
elif [ -f scripts/patch-apex-uploads-nginx.sh ] && [ -f /etc/nginx/sites-available/shuleplus-auth.conf ]; then
  bash scripts/patch-apex-uploads-nginx.sh >>"$LOG" 2>&1 || true
fi

sleep 4
AUTH_API=$(curl -sf --max-time 10 http://127.0.0.1:4001/api/v1/health 2>/dev/null || curl -sf --max-time 10 http://127.0.0.1:4001/ 2>/dev/null || true)
AUTH_WEB=$(curl -sf --max-time 10 -o /dev/null -w '%{http_code}' http://127.0.0.1:6100/ 2>/dev/null || echo "000")

if [ -n "$AUTH_API" ]; then
  echo "OK: auth-api responding on :4001" | tee -a "$LOG"
else
  echo "ERROR: auth-api not responding — pm2 logs auth-api --err --lines 40" | tee -a "$LOG"
  pm2 logs auth-api --err --lines 40 --nostream 2>/dev/null | tee -a "$LOG" || true
  exit 1
fi

if [ "$AUTH_WEB" = "200" ] || [ "$AUTH_WEB" = "307" ] || [ "$AUTH_WEB" = "308" ]; then
  echo "OK: auth-web responding on :6100 (HTTP $AUTH_WEB)" | tee -a "$LOG"
else
  echo "WARN: auth-web HTTP $AUTH_WEB on :6100 — check pm2 describe auth-web" | tee -a "$LOG"
  pm2 describe auth-web 2>/dev/null | tee -a "$LOG" || true
fi

pm2 save >>"$LOG" 2>&1 || true
echo "===== DONE — log: $LOG ====="
echo "Try https://shuleplus.rw and https://app.shuleplus.rw in the browser."
