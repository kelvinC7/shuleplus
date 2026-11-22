#!/bin/bash
# Build ShuleChat (InternalChat) API on the server (needs devDependencies for tsc).
# Usage: bash scripts/build-internal-chat-backend.sh
set -euo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
BD="$REPO/InternalChat/Backend"

cd "$BD"

echo "== npm install (include dev — required for tsc / @types/express) =="
npm install --include=dev --no-audit --no-fund

echo "== prisma + tsc build =="
npm run build

test -f dist/server.js && echo "OK: $BD/dist/server.js"
