#!/bin/bash
# Fix public school sites on website.shuleplus.rw (404 from React admin SPA).
# Public sites live at /<slug> and are served by MiniWebsite backend :4026.
#
# Usage:
#   cd ~/apps/shuleplus/ShulePlus
#   bash scripts/fix-miniwebsite-public-sites.sh
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
BPORT=4026
LOG="${LOG:-/tmp/fix-miniwebsite-public-sites.log}"

cd "$REPO" || exit 1
: >"$LOG"
echo "===== fix-miniwebsite-public-sites $(date -Is) =====" | tee -a "$LOG"

# Ensure admin SPA is built
FDIR="$REPO/MiniWebsite/Frontend"
if [ ! -f "$FDIR/dist/index.html" ]; then
  echo "Building MiniWebsite admin SPA..." | tee -a "$LOG"
  cd "$FDIR" || exit 1
  npm install --include=dev >>"$LOG" 2>&1
  npm run build >>"$LOG" 2>&1 || npx vite build >>"$LOG" 2>&1
fi

# Ensure backend running
if ! curl -sf "http://127.0.0.1:${BPORT}/api/health" >/dev/null 2>&1; then
  echo "Redeploying MiniWebsite backend..." | tee -a "$LOG"
  bash "$REPO/scripts/redeploy-module.sh" true MiniWebsite website-api website-web >>"$LOG" 2>&1 || true
fi

# Regenerate nginx (MiniWebsite slug → backend)
if grep -q 'MiniWebsite' "$REPO/scripts/generate-nginx-modules.sh" 2>/dev/null; then
  sudo bash "$REPO/scripts/generate-nginx-modules.sh" >>"$LOG" 2>&1
else
  echo "Patching website.conf manually..." | tee -a "$LOG"
  sudo python3 <<'PY'
from pathlib import Path
conf = Path("/etc/nginx/sites-available/website.conf")
text = conf.read_text()
slug = """
    location ~ ^/(?!home|dashboard|schools|assets|login|health|api|uploads)[a-z0-9][a-z0-9-]*$ {
        proxy_pass http://localhost:4026;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }"""
if "proxy_pass http://localhost:4026" not in text or "schools|assets" not in text:
    if "location / {" in text:
        text = text.replace("    location / {", slug + "\n    location / {", 1)
        conf.write_text(text)
        print("patched website.conf")
    else:
        raise SystemExit("website.conf format unexpected")
else:
    print("website.conf already patched")
PY
  sudo nginx -t && sudo systemctl reload nginx
fi

# Test a slug (adjust if needed)
TEST_SLUG="${TEST_SLUG:-st-matthew-s-school}"
echo "Testing /${TEST_SLUG} ..." | tee -a "$LOG"
curl -sfI "https://website.shuleplus.rw/${TEST_SLUG}" | head -5 | tee -a "$LOG"
curl -sf "http://127.0.0.1:${BPORT}/${TEST_SLUG}" | head -c 200 | tee -a "$LOG"; echo

echo ""
echo "If still 404: school must Publish in MiniWebsite admin (website.shuleplus.rw/home)."
echo "Regenerate site HTML: cd MiniWebsite/Backend && npx tsx scripts/regenerate-all-sites.ts"
echo "Log: $LOG"
