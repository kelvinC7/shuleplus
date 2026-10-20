#!/bin/bash
# Start ParentMIS frontend only (parents-web on :6114) — use when parents-api is already OK
# but parents.shuleplus.rw returns 502 (interrupted redeploy, missing pm2 process).
#
# Usage:
#   cd ~/apps/shuleplus/ShulePlus
#   bash scripts/start-parents-web.sh
#   bash scripts/start-parents-web.sh --rebuild   # force next build
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
FDIR="$REPO/ParentMIS/Frontend"
FPORT=6114
PM=parents-web
REBUILD=0
[ "${1:-}" = "--rebuild" ] && REBUILD=1

cd "$FDIR" || { echo "Missing $FDIR"; exit 1; }

cat > .env.production <<'EOF'
NEXT_PUBLIC_API_URL=https://parents.shuleplus.rw/api
NEXT_PUBLIC_IAM_URL=https://shuleplus.rw
NEXT_PUBLIC_IAM_API_URL=https://shuleplus.rw/api/v1
NEXT_PUBLIC_STUDENT_MGMT_API_URL=https://studentmanagement.shuleplus.rw/api
NEXT_PUBLIC_ACADEMIC_API_URL=https://academic.shuleplus.rw/api
NEXT_PUBLIC_FEES_PORTAL_URL=https://fees.shuleplus.rw
NEXT_PUBLIC_MODULE_NAME=Parent Portal
EOF
cp -f .env.production .env.production.local
rm -f .env.local .env.development.local

if [ "$REBUILD" = "1" ] || [ ! -f .next/BUILD_ID ]; then
  echo "Building ParentMIS frontend (may take several minutes)..."
  npm install --include=dev
  export NEXT_IGNORE_INCORRECT_LOCKFILE=true
  NEXT_IGNORE_INCORRECT_LOCKFILE=true npx next build || exit 1
fi

if [ ! -f .next/BUILD_ID ]; then
  echo "ERROR: .next/BUILD_ID missing — run: bash scripts/start-parents-web.sh --rebuild"
  exit 1
fi

pm2 delete "$PM" >/dev/null 2>&1 || true
fuser -k "${FPORT}/tcp" 2>/dev/null || true
sleep 1

pm2 start "npx next start -p $FPORT" --name "$PM" --interpreter none \
  --cwd "$FDIR" --update-env --env NEXT_IGNORE_INCORRECT_LOCKFILE=true
pm2 save

sleep 2
if curl -sf "http://127.0.0.1:${FPORT}/login" >/dev/null; then
  echo "OK: http://127.0.0.1:${FPORT}/login — https://parents.shuleplus.rw/login should work"
else
  echo "ERROR: :${FPORT}/login not responding"
  pm2 logs "$PM" --err --lines 25 --nostream
  exit 1
fi
