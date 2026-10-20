#!/bin/bash
# Diagnose + repair materials.shuleplus.rw (FE) and materials-api (ShuleKitMIS).
# Usage: cd /root/apps/shuleplus/ShulePlus && bash scripts/fix-materials-shulekit.sh
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
BDIR="$REPO/ShuleKitMIS/Backend"
AUTH_ENV="$REPO/Authentication/Backend/.env"
BABYEYI_ENV="$REPO/BabyeyiWizard/Backend/.env"
cd "$REPO" || exit 1

echo "===== SSL / nginx for materials.shuleplus.rw ====="
echo | openssl s_client -servername materials.shuleplus.rw -connect 127.0.0.1:443 2>/dev/null \
  | openssl x509 -noout -ext subjectAltName 2>/dev/null | tr ',' '\n' | grep -i materials \
  || echo "MISSING materials*.shuleplus.rw on cert → need certbot expand"
grep -Rln "materials\.shuleplus\.rw" /etc/nginx 2>/dev/null | head -10 \
  || echo "No nginx vhost for materials yet"

cd "$BDIR" || exit 1

# Build DATABASE_URL from Babyeyi host when present
DB_URL="postgresql://postgres:postgres@localhost:5432/shulekit_mis_db"
if [ -f "$BABYEYI_ENV" ]; then
  BY=$(grep '^DATABASE_URL=' "$BABYEYI_ENV" | head -1 | cut -d= -f2- | sed -E "s/^['\"]+|['\"]+$//g")
  if [[ "$BY" == postgres* ]]; then
    # Replace path (/dbname) with /shulekit_mis_db
    DB_URL=$(echo "$BY" | sed -E 's#(/[^/?]*)(\?.*)?$#/shulekit_mis_db#')
  fi
fi

AUTH_JWT="dev-access-secret-change-in-production-32chars"
AUTH_KEY="dev-service-key"
if [ -f "$AUTH_ENV" ]; then
  AUTH_JWT=$(grep '^JWT_ACCESS_SECRET=' "$AUTH_ENV" | head -1 | cut -d= -f2- | sed -E "s/^['\"]+|['\"]+$//g")
  AUTH_KEY=$(grep -E '^(MODULE_PROVISIONING_KEY|PLATFORM_SERVICE_KEY)=' "$AUTH_ENV" | head -1 | cut -d= -f2- | sed -E "s/^['\"]+|['\"]+$//g")
fi

cat > .env <<EOF
NODE_ENV=production
PORT=4021
API_PREFIX=/api
DATABASE_URL=${DB_URL}
JWT_ACCESS_SECRET=${AUTH_JWT}
PLATFORM_SERVICE_KEY=${AUTH_KEY}
SERVICE_API_KEY=${AUTH_KEY}
ACADEMIC_API_URL=http://127.0.0.1:4002/api
BABYEYI_API_URL=http://127.0.0.1:4017/api
IAM_API_URL=http://127.0.0.1:4001/api/v1
HOME_DELIVERY_FEE=2500
CORS_ORIGIN=https://materials.shuleplus.rw,https://shuleplus.rw,https://app.shuleplus.rw,https://www.shuleplus.rw
MODULE_SLUG=shulekit-mis
PUBLIC_BASE_URL=https://materials-api.shuleplus.rw
UPLOAD_DIR=uploads
EOF
echo "Wrote $BDIR/.env"
echo "DATABASE_URL=$(grep '^DATABASE_URL=' .env | cut -d= -f2- | cut -c1-48)…"

export DATABASE_URL="$DB_URL"

# Create DB if possible
DB_NAME="shulekit_mis_db"
PGHOST=$(python3 -c "from urllib.parse import urlparse; u=urlparse('$DB_URL'); print(u.hostname or 'localhost')")
PGPORT=$(python3 -c "from urllib.parse import urlparse; u=urlparse('$DB_URL'); print(u.port or 5432)")
PGUSER=$(python3 -c "from urllib.parse import urlparse; u=urlparse('$DB_URL'); print(u.username or 'postgres')")
PGPASS=$(python3 -c "from urllib.parse import urlparse; u=urlparse('$DB_URL'); print(u.password or '')")
export PGPASSWORD="$PGPASS"
if command -v psql >/dev/null 2>&1; then
  EXISTS=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" 2>/dev/null || true)
  if [ "$EXISTS" != "1" ]; then
    echo "Creating database ${DB_NAME}…"
    psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -c "CREATE DATABASE ${DB_NAME};" || true
  else
    echo "Database ${DB_NAME} exists"
  fi
fi

echo "===== prisma + rebuild ====="
npx prisma generate || true
npx prisma migrate deploy || true
npx prisma db push --accept-data-loss || true
npm run build || true
if [ -d src/generated ]; then
  mkdir -p dist/generated
  cp -a src/generated/. dist/generated/ 2>/dev/null || true
fi

pm2 delete materials-api >/dev/null 2>&1 || true
if [ -f dist/server.js ]; then
  pm2 start dist/server.js --name materials-api --cwd "$BDIR" --update-env --env NODE_ENV=production
elif [ -f src/server.ts ]; then
  pm2 start "npx tsx src/server.ts" --name materials-api --interpreter none --cwd "$BDIR" \
    --update-env --env NODE_ENV=production
fi
pm2 save >/dev/null 2>&1 || true
sleep 2

echo "===== health ====="
curl -sS -m 5 http://127.0.0.1:4021/api/health || curl -sS -m 5 http://127.0.0.1:4021/health || {
  echo "LOCAL API FAIL"
  pm2 logs materials-api --lines 40 --nostream
}
echo

echo "===== generate nginx (includes materials) ====="
bash "$REPO/scripts/generate-nginx-modules.sh" || true

echo ""
echo "NEXT: expand TLS cert (materials not in current SAN list):"
echo "  certbot --nginx -d materials.shuleplus.rw -d materials-api.shuleplus.rw --expand"
echo "  nginx -t && systemctl reload nginx"
echo "THEN rebuild FE:"
echo "  bash scripts/redeploy-module.sh true ShuleKitMIS materials-api materials-web"
