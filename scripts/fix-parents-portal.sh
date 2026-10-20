#!/bin/bash
# Fix parents.shuleplus.rw 502 — ParentMIS frontend (:6114) + API (:4015).
#
# Usage (on production server):
#   cd ~/apps/shuleplus/ShulePlus
#   git stash push -m "server"   # if pull blocked
#   git pull origin main
#   bash scripts/fix-parents-portal.sh
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
LOG="${LOG:-/tmp/fix-parents-portal.log}"
FPORT=6114
BPORT=4015

cd "$REPO" || exit 1
: >"$LOG"
echo "===== fix-parents-portal $(date -Is) =====" | tee -a "$LOG"

chmod +x scripts/redeploy-module.sh 2>/dev/null || true
bash scripts/redeploy-module.sh true ParentMIS parents-api parents-web >>"$LOG" 2>&1 \
  || { echo "ERROR: ParentMIS redeploy failed — see $LOG"; tail -n 50 "$LOG"; exit 1; }

if [ -f scripts/generate-nginx-modules.sh ]; then
  sudo bash scripts/generate-nginx-modules.sh >>"$LOG" 2>&1 \
    && echo "  nginx configs regenerated" | tee -a "$LOG" \
    || echo "  WARN: nginx regenerate failed" | tee -a "$LOG"
fi

sleep 2
if curl -sf "http://127.0.0.1:${FPORT}/login" >/dev/null; then
  echo "OK: localhost:${FPORT}/login responds" | tee -a "$LOG"
else
  echo "ERROR: localhost:${FPORT}/login still down" | tee -a "$LOG"
  pm2 describe parents-web | tee -a "$LOG" || true
  pm2 logs parents-web --err --lines 30 --nostream | tee -a "$LOG" || true
  exit 1
fi

if curl -sf "http://127.0.0.1:${BPORT}/api/health" >/dev/null \
  || curl -sf "http://127.0.0.1:${BPORT}/health" >/dev/null; then
  echo "OK: parents-api health on :${BPORT}" | tee -a "$LOG"
else
  echo "WARN: parents-api health failed on :${BPORT} — login may still work via Student Management" | tee -a "$LOG"
  pm2 logs parents-api --err --lines 20 --nostream | tee -a "$LOG" || true
fi

PUBLIC=$(curl -sfI "https://parents.shuleplus.rw/login" 2>/dev/null | head -1 || true)
echo "Public: ${PUBLIC:-FAILED}" | tee -a "$LOG"

pm2 save | tee -a "$LOG"
echo "===== DONE — log: $LOG ====="
