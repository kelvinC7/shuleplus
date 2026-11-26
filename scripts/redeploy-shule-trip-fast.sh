#!/bin/bash
# Fast ShuleTrip deploy (~3–10 min): API + env sync only. Skips slow Vite build on the VPS.
#
# UI: keep existing nginx dist/, or upload Frontend_react/dist from your PC after:
#   npx vite build   (with .env.production — see Frontend_react/.env.production.example)
#
# Usage (on server):
#   cd /root/apps/shuleplus/ShulePlus
#   git fetch origin main && git reset --hard origin/main
#   bash scripts/redeploy-shule-trip-fast.sh
#
# Full rebuild (slow on small VPS):
#   bash scripts/redeploy-shule-trip-fast.sh --frontend
#   # or: bash scripts/redeploy-module.sh true ShuleTrip shule-trip-api shule-trip-web
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
LOG="${LOG:-/tmp/redeploy-shule-trip-fast.log}"

cd "$REPO" || exit 1
chmod +x scripts/*.sh 2>/dev/null || true

WITH_FRONTEND=false
if [ "${1:-}" = "--frontend" ] || [ "${1:-}" = "--with-frontend" ]; then
  WITH_FRONTEND=true
fi

: >"$LOG"
echo "===== redeploy-shule-trip-fast $(date -Is) =====" | tee -a "$LOG"

if [ "$WITH_FRONTEND" = true ]; then
  echo ">>> Full redeploy (includes Vite build — may take 10–20+ min)" | tee -a "$LOG"
  bash scripts/redeploy-module.sh true ShuleTrip shule-trip-api shule-trip-web >>"$LOG" 2>&1
else
  echo ">>> Backend only (SKIP_FRONTEND=1)" | tee -a "$LOG"
  export SKIP_FRONTEND=1
  bash scripts/redeploy-module.sh true ShuleTrip shule-trip-api shule-trip-web >>"$LOG" 2>&1
fi

STATUS=$?
if [ "$STATUS" -ne 0 ]; then
  echo "ERROR: redeploy failed — see $LOG" | tee -a "$LOG"
  tail -n 50 "$LOG" || true
  exit "$STATUS"
fi

echo "" | tee -a "$LOG"
echo "===== DONE =====" | tee -a "$LOG"
curl -sf "http://127.0.0.1:4033/api/health" | tee -a "$LOG" || echo "WARN: health check failed" | tee -a "$LOG"
echo "" | tee -a "$LOG"
echo "Log: $LOG" | tee -a "$LOG"
if [ "$WITH_FRONTEND" = false ]; then
  echo "Frontend: upload PC-built dist to ShuleTrip/Frontend_react/dist or run with --frontend" | tee -a "$LOG"
fi
