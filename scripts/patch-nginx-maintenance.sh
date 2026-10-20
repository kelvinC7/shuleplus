#!/bin/bash
# Patch existing nginx vhosts to serve maintenance page when /var/www/shuleplus/maintenance/ON exists.
# Usage: sudo bash scripts/patch-nginx-maintenance.sh [conf-dir]
set -uo pipefail

CONF_DIR="${1:-/etc/nginx/sites-available}"
MAINT_DIR=/var/www/shuleplus/maintenance
REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
SNIPPET="    if (-f ${MAINT_DIR}/ON) {
        return 503;
    }
    error_page 503 @maintenance;
    location @maintenance {
        root ${MAINT_DIR};
        rewrite ^ /index.html break;
    }
"

mkdir -p "$MAINT_DIR"
if [ -f "${REPO}/config/maintenance/index.html" ]; then
  cp "${REPO}/config/maintenance/index.html" "${MAINT_DIR}/index.html"
fi

patched=0
for conf in "$CONF_DIR"/*.conf; do
  [ -f "$conf" ] || continue
  if grep -q 'location @maintenance' "$conf"; then
    echo "Skip (already patched): $conf"
    continue
  fi
  python3 - <<PY
from pathlib import Path
path = Path("$conf")
text = path.read_text()
snippet = """$SNIPPET"""
marker = "ssl_certificate_key"
idx = 0
count = 0
while True:
    loc = text.find(marker, idx)
    if loc < 0:
        break
    line_end = text.find("\n", loc)
    insert_at = line_end + 1
    text = text[:insert_at] + snippet + text[insert_at:]
    count += 1
    idx = insert_at + len(snippet)
if count:
    path.write_text(text)
    print(f"Patched {path} ({count} server block(s))")
PY
  patched=$((patched + 1))
done

echo "Done. Test with: sudo bash scripts/toggle-nginx-maintenance.sh enable"
nginx -t && systemctl reload nginx && echo "Nginx reloaded."
