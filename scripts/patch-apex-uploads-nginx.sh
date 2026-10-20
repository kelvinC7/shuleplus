#!/bin/bash
# Ensure apex shuleplus.rw Nginx proxies /uploads/ to Auth API (branding images).
# Without this, /uploads/* hits Next.js (auth-web) and logos appear broken.
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
if [ -f "$REPO/scripts/generate-shuleplus-apex-nginx.sh" ]; then
  exec sudo bash "$REPO/scripts/generate-shuleplus-apex-nginx.sh"
fi

CONF="${1:-/etc/nginx/sites-available/shuleplus-auth.conf}"
UPLOAD_PROXY='location /uploads/ {
        proxy_pass http://localhost:4001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }'

if [ ! -f "$CONF" ]; then
  echo "Config not found: $CONF" >&2
  exit 1
fi

if grep -q 'location /uploads/' "$CONF"; then
  echo "Already has /uploads/ location in $CONF"
else
  # Insert uploads location before the root location / block in the HTTPS server for shuleplus.rw
  python3 - <<PY
from pathlib import Path
path = Path("$CONF")
text = path.read_text()
needle = "    location / {\n        proxy_pass http://localhost:6100;"
upload = """    location /uploads/ {
        proxy_pass http://localhost:4001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

"""
if needle not in text:
    # fallback: insert before first "location / {" inside listen 443 ssl block for shuleplus.rw
    marker = "server_name shuleplus.rw www.shuleplus.rw;"
    idx = text.find(marker)
    if idx < 0:
        raise SystemExit("Could not find shuleplus.rw server block to patch")
    loc = text.find("location / {", idx)
    if loc < 0:
        raise SystemExit("Could not find location / in shuleplus.rw server block")
    text = text[:loc] + upload + text[loc:]
else:
    text = text.replace(needle, upload + needle, 1)
path.write_text(text)
print(f"Patched {path}")
PY
fi

nginx -t && systemctl reload nginx && echo "Nginx reloaded — /uploads/ → auth-api:4001"
