#!/bin/bash
# One command on the production server:
#   1) stash dirty tree + hard sync to origin/main
#   2) hosts hairpin + JWT/CORS + rebuild all modules
#   3) apply public catalog URLs
#   4) restart Auth with production env
#
# Usage:
#   cd /root/apps/shuleplus/ShulePlus
#   bash scripts/server-sync-and-fix-access.sh
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
cd "$REPO" || exit 1

echo "===== 1) Sync code from origin/main ====="
git fetch origin main
git checkout main
git stash push -u -m "server-pre-sync-$(date +%s)" || true
git reset --hard origin/main
git log -1 --oneline

chmod +x scripts/*.sh

echo ""
echo "===== 2) Auth NODE_ENV=production ====="
AUTH_ENV="$REPO/Authentication/Backend/.env"
if [ -f "$AUTH_ENV" ]; then
  if grep -q '^NODE_ENV=' "$AUTH_ENV"; then
    sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' "$AUTH_ENV"
  else
    echo 'NODE_ENV=production' >>"$AUTH_ENV"
  fi
fi

echo ""
echo "===== 3) Full module access fix (rebuild) ====="
bash scripts/fix-production-access.sh

echo ""
echo "===== 4) Module catalog → public subdomain URLs ====="
# Do not `source` Auth .env (SMTP_FROM with <email> breaks bash). Export DATABASE_URL only.
if [ -f "$AUTH_ENV" ]; then
  DATABASE_URL=$(grep '^DATABASE_URL=' "$AUTH_ENV" | head -1 | cut -d= -f2-)
  export DATABASE_URL
fi
node scripts/apply-module-subdomains.mjs || echo "WARN: catalog URL apply failed (check DATABASE_URL)"

echo ""
echo "===== 5) Nginx vhosts + TLS (library + all modules) ====="
sudo bash scripts/generate-nginx-modules.sh || echo "WARN: nginx generate failed"
sudo bash scripts/ensure-shuleplus-tls.sh || echo "WARN: TLS expand failed — ensure library DNS A records exist"

echo ""
echo "===== 6) Apex nginx + Auth restart ====="
if [ -f scripts/generate-shuleplus-apex-nginx.sh ]; then
  sudo bash scripts/generate-shuleplus-apex-nginx.sh || true
else
  bash scripts/patch-apex-uploads-nginx.sh || true
fi
pm2 restart auth-api --update-env
pm2 save

echo ""
echo "===== VERIFY ====="
curl -s --max-time 5 http://127.0.0.1:4007/api/health || echo "HR API health failed"
curl -s --max-time 5 http://127.0.0.1:4002/api/health || echo "Academic API health failed"
curl -s --max-time 5 http://127.0.0.1:4001/api/v1/health 2>/dev/null || curl -s --max-time 5 http://127.0.0.1:4001/ || true

echo ""
echo "DONE. Next in Super Admin:"
echo "  1) Module Catalog URLs should be https://{sub}.shuleplus.rw / https://{sub}-api.shuleplus.rw"
echo "  2) Org → Assigned modules → Re-provision / Repair all"
echo "  3) Open modules from Organization Dashboard (with ?token=)"
echo "Log: /tmp/fix-production-access.log"
