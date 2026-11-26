#!/bin/bash
# Fix Parent Portal API calls (ERR_NAME_NOT_RESOLVED on parents-api.shuleplus.rw).
# Routes API via https://parents.shuleplus.rw/api → localhost:4015 (no separate DNS needed).
#
# Usage:
#   cd ~/apps/shuleplus/ShulePlus
#   bash scripts/fix-parents-api-routing.sh
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
FDIR="$REPO/ParentMIS/Frontend"
FPORT=6114
BPORT=4015
NGINX_CONF=/etc/nginx/sites-available/parents.conf
LOG="${LOG:-/tmp/fix-parents-api-routing.log}"

cd "$REPO" || exit 1
: >"$LOG"
echo "===== fix-parents-api-routing $(date -Is) =====" | tee -a "$LOG"

# ── 1. Nginx: /api/ on parents.shuleplus.rw → :4015 ─────────────────────────
if [ -f "$REPO/scripts/generate-nginx-modules.sh" ]; then
  # Prefer full regen when repo has ParentMIS in EXTRA_FE
  if grep -q 'ParentMIS' "$REPO/scripts/generate-nginx-modules.sh" 2>/dev/null; then
    sudo bash "$REPO/scripts/generate-nginx-modules.sh" >>"$LOG" 2>&1
  fi
fi

if ! grep -q 'location /api/' "$NGINX_CONF" 2>/dev/null; then
  echo "Patching $NGINX_CONF with /api/ proxy..." | tee -a "$LOG"
  sudo python3 - <<'PY'
from pathlib import Path
conf = Path("/etc/nginx/sites-available/parents.conf")
text = conf.read_text()
block = """
    location /api/ {
        proxy_pass http://localhost:4015;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 12m;
    }"""
if "location /api/" not in text:
    marker = "    location / {"
    if marker in text:
        text = text.replace(marker, block + "\n" + marker, 1)
        conf.write_text(text)
        print("patched parents.conf")
    else:
        raise SystemExit("could not find location / in parents.conf")
else:
    print("parents.conf already has /api/")
PY
  sudo nginx -t && sudo systemctl reload nginx
fi

curl -sf "http://127.0.0.1:${BPORT}/api/health" >/dev/null \
  && echo "OK: parents-api localhost:${BPORT}/api/health" | tee -a "$LOG" \
  || echo "WARN: parents-api not healthy on :${BPORT}" | tee -a "$LOG"

# ── 2. Frontend env + rebuild (bake parents.shuleplus.rw/api into bundle) ───
cd "$FDIR" || exit 1
cat > .env.production <<'EOF'
NEXT_PUBLIC_API_URL=https://parents.shuleplus.rw/api
NEXT_PUBLIC_IAM_URL=https://shuleplus.rw
NEXT_PUBLIC_IAM_API_URL=https://shuleplus.rw/api/v1
NEXT_PUBLIC_STUDENT_MGMT_API_URL=https://studentmanagement.shuleplus.rw/api
NEXT_PUBLIC_ACADEMIC_API_URL=https://academic.shuleplus.rw/api
NEXT_PUBLIC_FEES_PORTAL_URL=https://fees.shuleplus.rw
NEXT_PUBLIC_MODULE_NAME=Parent Portal
EOF
cp -f .env.production .env.production.local
rm -f .env.local .env.development.local

echo "Rebuilding ParentMIS frontend (required — URLs are baked at build time)..." | tee -a "$LOG"
npm install --include=dev >>"$LOG" 2>&1
export NEXT_IGNORE_INCORRECT_LOCKFILE=true
NEXT_IGNORE_INCORRECT_LOCKFILE=true npx next build >>"$LOG" 2>&1 || {
  echo "ERROR: next build failed — tail $LOG"; tail -n 40 "$LOG"; exit 1
}

pm2 delete parents-web >/dev/null 2>&1 || true
fuser -k "${FPORT}/tcp" 2>/dev/null || true
sleep 1
pm2 start "npx next start -p $FPORT" --name parents-web --interpreter none \
  --cwd "$FDIR" --update-env --env NEXT_IGNORE_INCORRECT_LOCKFILE=true >>"$LOG" 2>&1
pm2 save >>"$LOG" 2>&1

sleep 2
curl -sf "https://parents.shuleplus.rw/api/health" | head -c 120; echo
if curl -sf "http://127.0.0.1:${FPORT}/login" >/dev/null; then
  echo "OK: parents-web + same-origin API routing" | tee -a "$LOG"
else
  echo "WARN: parents-web /login check failed" | tee -a "$LOG"
fi

echo "Hard-refresh browser (Ctrl+Shift+R). API calls should go to parents.shuleplus.rw/api not parents-api.*"
echo "Log: $LOG"
