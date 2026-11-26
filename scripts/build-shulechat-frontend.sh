#!/bin/bash
# Build ShuleChat (InternalChat) Vite frontend on the server.
# Usage: bash scripts/build-shulechat-frontend.sh
set -euo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
FDIR="$REPO/InternalChat/Frontend"
APIHOST="${APIHOST:-shulechat-api.shuleplus.rw}"
FEHOST="${FEHOST:-shulechat.shuleplus.rw}"

cd "$FDIR"

echo "== clean install (fixes npm edgesOut / missing vite) =="
rm -rf node_modules
npm cache clean --force 2>/dev/null || true
npm install --include=dev --legacy-peer-deps --no-audit --no-fund

cat > .env.production <<EOF
VITE_API_URL=https://${APIHOST}/api
VITE_SOCKET_URL=https://${FEHOST}
VITE_IAM_URL=https://shuleplus.rw
VITE_IAM_API_URL=https://shuleplus.rw/api/v1
EOF
cp -f .env.production .env.production.local

export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=6144"
echo "== vite build (10–20 min on small VPS) =="
if [ -f node_modules/vite/bin/vite.js ]; then
  node node_modules/vite/bin/vite.js build
elif [ -x node_modules/.bin/vite ]; then
  node node_modules/.bin/vite build
else
  npx --yes vite@8.1.1 build
fi

test -f dist/index.html && echo "OK: $FDIR/dist/index.html"
