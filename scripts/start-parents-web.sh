#!/bin/bash
# Start ParentMIS frontend only (parents-web on :6114) — use when parents-api is
# already OK but parents.shuleplus.rw is down (502, or 404 "The requested path
# could not be found").
#
# ParentMIS uses Next.js static export (output: 'export'), so it is served from
# out/ by `serve`. `next start` does NOT work with this config.
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
NEXT_PUBLIC_STUDENT_MGMT_API_URL=https://studentmanagement-api.shuleplus.rw/api
NEXT_PUBLIC_FEES_PORTAL_URL=https://fees.shuleplus.rw
NEXT_PUBLIC_PARENT_PORTAL_URL=https://parents.shuleplus.rw
NEXT_PUBLIC_MODULE_NAME=Parent Portal
EOF
cp -f .env.production .env.production.local
rm -f .env.local .env.development.local

if [ "$REBUILD" = "1" ] || [ ! -f out/index.html ]; then
  echo "Building ParentMIS static export (may take several minutes)..."
  npm install --include=dev
  export NEXT_IGNORE_INCORRECT_LOCKFILE=true
  export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=4096"
  # Keep the previous export until the new one is verified.
  rm -rf out.prev
  if [ -d out ]; then mv out out.prev; fi
  if NEXT_IGNORE_INCORRECT_LOCKFILE=true npx next build; then
    rm -rf out.prev
  else
    rm -rf out
    if [ -d out.prev ]; then mv out.prev out; fi
    echo "ERROR: next build failed — previous out/ restored"
    exit 1
  fi
fi

if [ ! -f out/index.html ]; then
  echo "ERROR: out/index.html missing — run: bash scripts/start-parents-web.sh --rebuild"
  exit 1
fi

pm2 delete "$PM" >/dev/null 2>&1 || true
fuser -k "${FPORT}/tcp" 2>/dev/null || true
sleep 1

echo "pm2 serve out/ on :${FPORT} → $PM"
pm2 start npx --name "$PM" --cwd "$FDIR" --interpreter none \
  -- --yes serve@latest -s out -l "tcp://0.0.0.0:${FPORT}"
pm2 save

for _ in $(seq 1 12); do
  curl -sf "http://127.0.0.1:${FPORT}/" >/dev/null 2>&1 && break
  sleep 2
done

if curl -sf "http://127.0.0.1:${FPORT}/" >/dev/null 2>&1; then
  echo "OK: http://127.0.0.1:${FPORT}/ — https://parents.shuleplus.rw should work"
else
  echo "ERROR: :${FPORT}/ not responding"
  pm2 logs "$PM" --err --lines 30 --nostream
  exit 1
fi
