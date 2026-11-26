#!/bin/bash
# Fix production Action Plan (502) and School Fees (Access Denied) on mopas.
# Run as root on the app server:
#   cd /root/apps/shuleplus/ShulePlus && bash scripts/fix-action-plan-and-fees.sh
set -euo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
cd "$REPO"

echo "==> Pull latest code"
git stash push -m "pre-fix-$(date +%F-%H%M)" 2>/dev/null || true
git pull origin main
git stash pop 2>/dev/null || true

echo "==> Apply production subdomain URLs to IAM catalog"
node scripts/apply-module-subdomains.mjs
node scripts/repair-fees-module-slug.mjs

echo "==> Ensure Auth uses production module URLs"
AUTH_ENV="$REPO/Authentication/Backend/.env"
if [ -f "$AUTH_ENV" ]; then
  for kv in \
    "NODE_ENV=production" \
    "FORCE_LOCAL_MODULE_URLS=false" \
    "FRONTEND_URL=https://app.shuleplus.rw"; do
    key="${kv%%=*}"
    val="${kv#*=}"
    if grep -q "^${key}=" "$AUTH_ENV"; then
      sed -i "s|^${key}=.*|${key}=${val}|" "$AUTH_ENV"
    else
      echo "${key}=${val}" >> "$AUTH_ENV"
    fi
  done
fi

echo "==> Redeploy Authentication (IAM JWT + launch URLs)"
bash scripts/redeploy-module.sh true Authentication auth-api auth-web

echo "==> Redeploy Action Plan MIS (502 fix)"
bash scripts/redeploy-module.sh true ActionPlanMIS action-plan-api action-plan-web

echo "==> Redeploy School Fees (Access Denied fix)"
bash scripts/redeploy-module.sh true SchoolFeesPortal fees-api fees-web

echo "==> Regenerate Nginx vhosts (proxy ports 6108 / 6103 / 4009 / 4004)"
if [ -x /usr/sbin/nginx ] || command -v nginx >/dev/null 2>&1; then
  bash scripts/generate-nginx-modules.sh || true
fi

echo "==> PM2 status"
pm2 list

echo ""
echo "Smoke checks (expect HTTP 200):"
curl -sf "http://127.0.0.1:6108/" >/dev/null && echo "  OK action-plan-web :6108" || echo "  FAIL action-plan-web :6108"
curl -sf "http://127.0.0.1:4009/api/health" >/dev/null && echo "  OK action-plan-api :4009" || echo "  FAIL action-plan-api :4009"
curl -sf "http://127.0.0.1:6103/" >/dev/null && echo "  OK fees-web :6103" || echo "  FAIL fees-web :6103"
curl -sf "http://127.0.0.1:4004/api/health" >/dev/null && echo "  OK fees-api :4004" || echo "  FAIL fees-api :4004"

pm2 save
echo ""
echo "Done. Open modules from https://app.shuleplus.rw (do not bookmark /dashboard without token)."
