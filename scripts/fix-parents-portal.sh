#!/bin/bash
# Repair parents.shuleplus.rw — ParentMIS frontend (:6114) + API (:4015).
#
# Covers both failure modes:
#   502  — parents-web missing or crashed
#   404 "The requested path could not be found"
#        — parents-web is alive but its out/ export was wiped by an
#          interrupted / OOM-killed `next build`
#
# Usage (on production server):
#   cd ~/apps/shuleplus/ShulePlus
#   git pull origin main
#   bash scripts/fix-parents-portal.sh
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
LOG="${LOG:-/tmp/fix-parents-portal.log}"
FPORT=6114
BPORT=4015
FDIR="$REPO/ParentMIS/Frontend"

cd "$REPO" || exit 1
: >"$LOG"
echo "===== fix-parents-portal $(date -Is) =====" | tee -a "$LOG"

echo "--- diagnose ---" | tee -a "$LOG"
if [ -f "$FDIR/out/index.html" ]; then
  echo "  out/index.html: present" | tee -a "$LOG"
else
  echo "  out/index.html: MISSING — this is what causes the 404" | tee -a "$LOG"
fi
pm2 describe parents-web 2>/dev/null | grep -E 'status|script path|cwd' | tee -a "$LOG" || true
LOCAL_BEFORE=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${FPORT}/" 2>/dev/null || echo 000)
echo "  :${FPORT}/ returns HTTP ${LOCAL_BEFORE}" | tee -a "$LOG"

# Fast path: parents-web alive but started from the wrong directory (e.g. the
# Capacitor app ParentApp/ has no out/) → serve 404s every route. Restarting
# from ParentMIS/Frontend is enough; no rebuild required.
CURRENT_CWD=$(pm2 jlist 2>/dev/null | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const a=JSON.parse(d);const p=a.find(x=>x.name==="parents-web");if(p&&p.pm2_env)console.log(p.pm2_env.pm_cwd||"")}catch(e){}})' 2>/dev/null || true)
if [ -f "$FDIR/out/index.html" ] && [ -n "$CURRENT_CWD" ] && [ "$CURRENT_CWD" != "$FDIR" ]; then
  echo "  parents-web cwd is '$CURRENT_CWD' — expected '$FDIR'" | tee -a "$LOG"
  echo "  restarting parents-web from the correct directory (no rebuild)" | tee -a "$LOG"
  pm2 delete parents-web >/dev/null 2>&1 || true
  fuser -k "${FPORT}/tcp" 2>/dev/null || true
  sleep 1
  pm2 start npx --name parents-web --cwd "$FDIR" --interpreter none \
    -- --yes serve@latest -s out -l "tcp://0.0.0.0:${FPORT}" >>"$LOG" 2>&1
  pm2 save >>"$LOG" 2>&1 || true
  sleep 4
  LOCAL_CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${FPORT}/" 2>/dev/null || echo 000)
  if [ "$LOCAL_CODE" = "200" ]; then
    echo "OK: localhost:${FPORT}/ responds 200 (cwd repaired)" | tee -a "$LOG"
    if [ -f scripts/generate-nginx-modules.sh ]; then
      sudo bash scripts/generate-nginx-modules.sh >>"$LOG" 2>&1 || true
    fi
    PUBLIC=$(curl -sfI "https://parents.shuleplus.rw/login" 2>/dev/null | head -1 || true)
    echo "Public: ${PUBLIC:-FAILED}" | tee -a "$LOG"
    echo "  note: served build is $(date -r "$FDIR/out/index.html" '+%Y-%m-%d %H:%M') — redeploy to refresh it" | tee -a "$LOG"
    echo "===== DONE — log: $LOG ====="
    exit 0
  fi
  echo "  restart from correct cwd did not fix :${FPORT} — falling through to full redeploy" | tee -a "$LOG"
fi

chmod +x scripts/redeploy-module.sh 2>/dev/null || true
bash scripts/redeploy-module.sh true ParentMIS parents-api parents-web >>"$LOG" 2>&1 \
  || { echo "ERROR: ParentMIS redeploy failed — see $LOG"; tail -n 60 "$LOG"; exit 1; }

if [ -f scripts/generate-nginx-modules.sh ]; then
  sudo bash scripts/generate-nginx-modules.sh >>"$LOG" 2>&1 \
    && echo "  nginx configs regenerated" | tee -a "$LOG" \
    || echo "  WARN: nginx regenerate failed" | tee -a "$LOG"
fi

sleep 2
LOCAL_CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${FPORT}/" 2>/dev/null || echo 000)
if [ "$LOCAL_CODE" = "200" ]; then
  echo "OK: localhost:${FPORT}/ responds 200" | tee -a "$LOG"
else
  echo "ERROR: localhost:${FPORT}/ returned ${LOCAL_CODE}" | tee -a "$LOG"
  pm2 describe parents-web | tee -a "$LOG" || true
  pm2 logs parents-web --err --lines 40 --nostream | tee -a "$LOG" || true
  exit 1
fi

if curl -sf "http://127.0.0.1:${BPORT}/api/health" >/dev/null \
  || curl -sf "http://127.0.0.1:${BPORT}/health" >/dev/null; then
  echo "OK: parents-api health on :${BPORT}" | tee -a "$LOG"
else
  echo "WARN: parents-api health failed on :${BPORT} — login may still work via Student Management" | tee -a "$LOG"
  pm2 logs parents-api --err --lines 20 --nostream | tee -a "$LOG" || true
fi

PUBLIC=$(curl -sfI "https://parents.shuleplus.rw/login" 2>/dev/null | head -1 || true)
echo "Public: ${PUBLIC:-FAILED}" | tee -a "$LOG"

pm2 save | tee -a "$LOG"
echo "===== DONE — log: $LOG ====="
