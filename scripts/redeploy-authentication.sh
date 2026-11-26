#!/bin/bash
# Safe production deploy for IAM + landing (shuleplus.rw / app.shuleplus.rw).
# Always: staging Next build → swap .next → free :6100 → auth-web → apex nginx → CSS verify.
#
# Usage (on server):
#   cd /root/apps/shuleplus/ShulePlus
#   git pull --ff-only origin main
#   bash scripts/redeploy-authentication.sh
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
LOG="${LOG:-/tmp/redeploy-authentication.log}"
export REPO LOG

cd "$REPO" || exit 1
chmod +x scripts/*.sh 2>/dev/null || true

: >"$LOG"
echo "===== redeploy-authentication $(date -Is) =====" | tee -a "$LOG"

if ! bash scripts/redeploy-module.sh true Authentication auth-api auth-web >>"$LOG" 2>&1; then
  echo "ERROR: redeploy-module Authentication failed — see $LOG" | tee -a "$LOG"
  tail -n 60 "$LOG" || true
  exit 1
fi

echo "===== DONE — log: $LOG ====="
echo "Landing: https://shuleplus.rw  |  IAM UI: https://app.shuleplus.rw"
