#!/bin/bash
# Deploy WebpageBabyeyi (public babyeyi.rw site) — backend :4027, frontend :6126.
# Port 6126 is reserved for babyeyi.rw ONLY (6125 was conflicting with Transport on some servers).
# Run on the production server after DNS for babyeyi.rw / www / api.babyeyi.rw points here.
#
# Usage:
#   cd /root/apps/shuleplus/ShulePlus
#   git pull origin main
#   sudo bash scripts/deploy-babyeyi-rw.sh
#
# Optional env overrides:
#   REPO=/root/apps/shuleplus/ShulePlus
#   CERT_EMAIL=admin@babyeyi.rw
#   SKIP_TLS=1          # skip certbot + nginx write (app only)
#   SKIP_NGINX=1        # skip all nginx steps
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
CERT_EMAIL="${CERT_EMAIL:-admin@babyeyi.rw}"
BPORT=4027
FPORT=6126
PM_API=babyeyi-rw-api
PM_WEB=babyeyi-rw-web
NGINX_CONF=/etc/nginx/sites-available/babyeyi-rw.conf
ACME_ROOT=/var/www/babyeyi-acme
LOG="${LOG:-/tmp/deploy-babyeyi-rw.log}"

BDIR="$REPO/WebpageBabyeyi/Backend"
FDIR="$REPO/WebpageBabyeyi/Frontend"

echo "===== babyeyi.rw deploy $(date -Is) =====" | tee "$LOG"

# ── 1. Backend ────────────────────────────────────────────────────────────────
cd "$BDIR" || exit 1
cat > .env <<'EOF'
PORT=4027
NODE_ENV=production
CORS_ORIGIN=https://babyeyi.rw,https://www.babyeyi.rw
STUDENT_MANAGEMENT_URL=http://127.0.0.1:4024/api
BABYEYI_WIZARD_URL=http://127.0.0.1:4017/api
SCHOOL_FEES_URL=http://127.0.0.1:4004/api
AUTH_URL=http://127.0.0.1:4001/api/v1
MINIWEBSITE_API_URL=http://127.0.0.1:4026/api
EOF

echo "  [backend] npm install + build..." | tee -a "$LOG"
npm install >> "$LOG" 2>&1
npm run build >> "$LOG" 2>&1

pm2 delete "$PM_API" >/dev/null 2>&1 || true
fuser -k "${BPORT}/tcp" 2>/dev/null || true
sleep 1
pm2 start dist/server.js --name "$PM_API" --cwd "$BDIR" --update-env --env NODE_ENV=production >> "$LOG" 2>&1

HEALTH_OK=0
for i in 1 2 3 4 5; do
  if curl -sf "http://127.0.0.1:${BPORT}/api/health" >/dev/null; then
    HEALTH_OK=1
    break
  fi
  sleep 2
done
if [ "$HEALTH_OK" = "1" ]; then
  echo "  [backend] health ok :${BPORT}/api/health" | tee -a "$LOG"
  if curl -sf "http://127.0.0.1:${BPORT}/api/school-registrations" >/dev/null; then
    echo "  [backend] school registry proxy ok" | tee -a "$LOG"
  else
    echo "  [backend] WARNING: /api/school-registrations failed — is auth-api running on :4001?" | tee -a "$LOG"
    pm2 logs auth-api --err --lines 15 --nostream 2>/dev/null | tee -a "$LOG" || true
  fi
else
  echo "  [backend] WARNING: health check failed on :${BPORT}" | tee -a "$LOG"
  pm2 logs "$PM_API" --err --lines 30 --nostream | tee -a "$LOG" || true
fi

# ── 2. Frontend ───────────────────────────────────────────────────────────────
cd "$FDIR" || exit 1
rm -f .env.local .env.development.local
cat > .env.production <<'EOF'
NEXT_PUBLIC_BABYEYI_API_URL=https://api.babyeyi.rw/api
NEXT_PUBLIC_AUTH_URL=https://shuleplus.rw
NEXT_PUBLIC_PARENT_PORTAL_URL=https://parents.shuleplus.rw/login
NEXT_PUBLIC_TEACHER_PORTAL_URL=https://ticha.shuleplus.rw/login
NEXT_PUBLIC_BABYEYI_MODULE_URL=https://babyeyi.shuleplus.rw
NEXT_PUBLIC_MINI_WEBSITE_URL=https://website.shuleplus.rw
EOF
cp -f .env.production .env.production.local

echo "  [frontend] npm install + next build..." | tee -a "$LOG"
npm install --include=dev >> "$LOG" 2>&1
export NEXT_IGNORE_INCORRECT_LOCKFILE=true
if ! NEXT_IGNORE_INCORRECT_LOCKFILE=true npx next build >> "$LOG" 2>&1; then
  echo "  [frontend] build failed — see $LOG" | tee -a "$LOG"
  tail -n 40 "$LOG"
  exit 1
fi

pm2 delete "$PM_WEB" >/dev/null 2>&1 || true
# Transport and other Next apps were incorrectly bound to :6125 on some servers.
for rogue in transport-web transport-web-old babyeyi-rw-web; do
  pm2 delete "$rogue" >/dev/null 2>&1 || true
done
fuser -k "${FPORT}/tcp" 2>/dev/null || true
fuser -k 6125/tcp 2>/dev/null || true
sleep 1
pm2 start "npx next start -p $FPORT" --name "$PM_WEB" --interpreter none \
  --cwd "$FDIR" --update-env --env NEXT_IGNORE_INCORRECT_LOCKFILE=true >> "$LOG" 2>&1
pm2 save >> "$LOG" 2>&1

sleep 3
HOME_HTML=$(curl -sf "http://127.0.0.1:${FPORT}/" 2>/dev/null || true)
if echo "$HOME_HTML" | grep -qi 'Smart Transport'; then
  echo "  [frontend] ERROR: :${FPORT} is serving Transport — wrong app" | tee -a "$LOG"
  pm2 ls | tee -a "$LOG"
  exit 1
fi
if echo "$HOME_HTML" | grep -qi 'Missing access token'; then
  echo "  [frontend] ERROR: :${FPORT} is serving licensed BabyeyiWizard, not public WebpageBabyeyi" | tee -a "$LOG"
  pm2 describe "$PM_WEB" | tee -a "$LOG" || true
  exit 1
fi
if echo "$HOME_HTML" | grep -qi 'Parents Convenience\|Loading schools directory\|Explore schools\|babyeyi\.rw'; then
  echo "  [frontend] ok on :${FPORT} (public WebpageBabyeyi)" | tee -a "$LOG"
elif curl -sf "http://127.0.0.1:${FPORT}/" >/dev/null; then
  echo "  [frontend] WARNING: :${FPORT} responds but content unexpected — verify manually" | tee -a "$LOG"
else
  echo "  [frontend] WARNING: :${FPORT} not responding yet" | tee -a "$LOG"
fi
if curl -sfI "http://127.0.0.1:${FPORT}/dashboard" 2>/dev/null | grep -qi 'location:.*/'; then
  echo "  [frontend] /dashboard redirects to public home" | tee -a "$LOG"
fi

if [ "${SKIP_NGINX:-}" = "1" ]; then
  echo "===== DONE (nginx skipped) — pm2: $PM_API, $PM_WEB =====" | tee -a "$LOG"
  exit 0
fi

# ── 3. DNS check ──────────────────────────────────────────────────────────────
echo "  [dns] checking A records..." | tee -a "$LOG"
for host in babyeyi.rw www.babyeyi.rw api.babyeyi.rw; do
  ip=$(dig +short "$host" | tail -1)
  echo "    $host → ${ip:-MISSING}" | tee -a "$LOG"
done

if [ "${SKIP_TLS:-}" = "1" ]; then
  echo "===== DONE (TLS skipped) — configure nginx manually =====" | tee -a "$LOG"
  exit 0
fi

# ── 4. ACME webroot (HTTP only) ───────────────────────────────────────────────
# Drop legacy nginx vhosts that may have pointed babyeyi.rw at the licensed wizard app.
for legacy in babyeyi.conf babyeyi-wizard.conf; do
  rm -f "/etc/nginx/sites-enabled/$legacy" 2>/dev/null || true
done

mkdir -p "$ACME_ROOT/.well-known/acme-challenge"
tee "$NGINX_CONF" > /dev/null <<'EOF'
server {
    listen 80;
    server_name babyeyi.rw www.babyeyi.rw api.babyeyi.rw;
    location /.well-known/acme-challenge/ { root /var/www/babyeyi-acme; }
    location / { return 404; }
}
EOF
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/babyeyi-rw.conf
nginx -t && nginx -s reload

certbot certonly --webroot -w "$ACME_ROOT" \
  -d babyeyi.rw -d www.babyeyi.rw -d api.babyeyi.rw \
  --non-interactive --agree-tos -m "$CERT_EMAIL" \
  || echo "  [tls] certbot failed — fix DNS then re-run" | tee -a "$LOG"

# ── 5. Final nginx (HTTPS) ────────────────────────────────────────────────────
# /uploads/ → Auth API (:4001) for school logos/branding (same as shuleplus.rw apex).
tee "$NGINX_CONF" > /dev/null <<'EOF'
server {
    listen 80;
    server_name babyeyi.rw www.babyeyi.rw api.babyeyi.rw;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl;
    server_name babyeyi.rw www.babyeyi.rw;
    ssl_certificate /etc/letsencrypt/live/babyeyi.rw/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/babyeyi.rw/privkey.pem;

    location /uploads/ {
        proxy_pass http://127.0.0.1:4001;
        proxy_set_header Host app.shuleplus.rw;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 12m;
    }
    # Public site only — school console is on babyeyi.shuleplus.rw (licensed).
    location = /dashboard { return 302 /; }
    location ^~ /dashboard/ { return 302 /; }
    location / {
        proxy_pass http://127.0.0.1:6126;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
server {
    listen 443 ssl;
    server_name api.babyeyi.rw;
    ssl_certificate /etc/letsencrypt/live/babyeyi.rw/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/babyeyi.rw/privkey.pem;
    location / {
        proxy_pass http://127.0.0.1:4027;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50m;
    }
}
EOF
nginx -t && nginx -s reload

# Restore babyeyi.rw cert if ensure-shuleplus-tls overwrote it earlier
if [ -f "$REPO/scripts/ensure-babyeyi-rw-tls.sh" ]; then
  if grep -q 'letsencrypt/live/shuleplus.rw' "$NGINX_CONF" 2>/dev/null; then
    echo "  [tls] babyeyi-rw.conf has wrong cert path — restoring" | tee -a "$LOG"
    SKIP_CERTBOT=1 bash "$REPO/scripts/ensure-babyeyi-rw-tls.sh" >>"$LOG" 2>&1 || true
  fi
fi

echo "===== DONE babyeyi.rw =====" | tee -a "$LOG"
echo "  Site:  https://babyeyi.rw" | tee -a "$LOG"
echo "  API:   https://api.babyeyi.rw/api/health" | tee -a "$LOG"
echo "  PM2:   $PM_API (:$BPORT), $PM_WEB (:$FPORT)" | tee -a "$LOG"
echo "  Env:   WebpageBabyeyi/Backend/.env + Frontend/.env.production" | tee -a "$LOG"
echo "  Upstreams (server localhost):" | tee -a "$LOG"
echo "    AUTH_URL=http://127.0.0.1:4001/api/v1" | tee -a "$LOG"
echo "    STUDENT_MANAGEMENT_URL=http://127.0.0.1:4024/api" | tee -a "$LOG"
echo "    BABYEYI_WIZARD_URL=http://127.0.0.1:4017/api" | tee -a "$LOG"
echo "    SCHOOL_FEES_URL=http://127.0.0.1:4004/api" | tee -a "$LOG"
