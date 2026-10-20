#!/bin/bash
# Restore / issue Let's Encrypt cert for babyeyi.rw (separate from shuleplus.rw wildcard).
#
# babyeyi.rw uses its own cert lineage: /etc/letsencrypt/live/babyeyi.rw/
# Do NOT run ensure-shuleplus-tls.sh on babyeyi-rw.conf — it overwrites cert paths and
# causes NET::ERR_CERT_COMMON_NAME_INVALID in browsers.
#
# Usage (on server as root):
#   cd /root/apps/shuleplus/ShulePlus
#   sudo bash scripts/ensure-babyeyi-rw-tls.sh
#
# Optional:
#   CERT_EMAIL=admin@babyeyi.rw
#   SKIP_CERTBOT=1   # only rewrite nginx to use babyeyi.rw cert (if already issued)
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
CERT_NAME=babyeyi.rw
CERT_DIR="/etc/letsencrypt/live/${CERT_NAME}"
CERT_EMAIL="${CERT_EMAIL:-admin@babyeyi.rw}"
ACME_ROOT=/var/www/babyeyi-acme
NGINX_CONF=/etc/nginx/sites-available/babyeyi-rw.conf

echo "===== ensure-babyeyi-rw-tls $(date -Is) ====="

mkdir -p "$ACME_ROOT/.well-known/acme-challenge"

# HTTP-only vhost for ACME + redirect after cert exists
if [ ! -f "$CERT_DIR/fullchain.pem" ] && [ "${SKIP_CERTBOT:-}" != "1" ]; then
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

  echo "Issuing cert for babyeyi.rw, www.babyeyi.rw, api.babyeyi.rw ..."
  certbot certonly --webroot -w "$ACME_ROOT" \
    --cert-name "$CERT_NAME" \
    -d babyeyi.rw -d www.babyeyi.rw -d api.babyeyi.rw \
    --non-interactive --agree-tos -m "$CERT_EMAIL" \
    || { echo "ERROR: certbot failed — check DNS A records for babyeyi.rw"; exit 1; }
elif [ -f "$CERT_DIR/fullchain.pem" ]; then
  echo "Cert exists: $CERT_DIR"
  openssl x509 -in "$CERT_DIR/fullchain.pem" -noout -ext subjectAltName 2>/dev/null \
    | tr ',' '\n' | sed 's/^ *//' | grep -i DNS || true
else
  echo "ERROR: cert missing and SKIP_CERTBOT=1 — run without SKIP_CERTBOT"
  exit 1
fi

# Full HTTPS nginx (same as deploy-babyeyi-rw.sh)
tee "$NGINX_CONF" > /dev/null <<EOF
server {
    listen 80;
    server_name babyeyi.rw www.babyeyi.rw api.babyeyi.rw;
    return 301 https://\$host\$request_uri;
}
server {
    listen 443 ssl;
    server_name babyeyi.rw www.babyeyi.rw;
    ssl_certificate ${CERT_DIR}/fullchain.pem;
    ssl_certificate_key ${CERT_DIR}/privkey.pem;

    location /uploads/ {
        proxy_pass http://127.0.0.1:4001;
        proxy_set_header Host app.shuleplus.rw;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 12m;
    }
    location = /dashboard { return 302 /; }
    location ^~ /dashboard/ { return 302 /; }
    location / {
        proxy_pass http://127.0.0.1:6126;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
server {
    listen 443 ssl;
    server_name api.babyeyi.rw;
    ssl_certificate ${CERT_DIR}/fullchain.pem;
    ssl_certificate_key ${CERT_DIR}/privkey.pem;
    location / {
        proxy_pass http://127.0.0.1:4027;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 50m;
    }
}
EOF
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/babyeyi-rw.conf

# Drop legacy vhosts that steal babyeyi.rw or use wrong cert
for legacy in babyeyi.conf babyeyi-wizard.conf; do
  rm -f "/etc/nginx/sites-enabled/$legacy" 2>/dev/null || true
done

nginx -t && systemctl reload nginx

echo ""
echo "===== Verify babyeyi.rw SNI ====="
echo | openssl s_client -servername babyeyi.rw -connect 127.0.0.1:443 2>/dev/null \
  | openssl x509 -noout -subject -ext subjectAltName 2>/dev/null \
  | grep -E 'babyeyi\.rw|subject=' || echo "FAIL: wrong cert served for babyeyi.rw"

curl -sfI "https://babyeyi.rw/" | head -5 || echo "WARN: curl to https://babyeyi.rw failed"

echo ""
echo "Done. Cert: $CERT_DIR"
echo "If SSL breaks again after ensure-shuleplus-tls.sh, re-run: sudo bash scripts/ensure-babyeyi-rw-tls.sh"
