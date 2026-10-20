#!/bin/bash
# Action Plan MIS — production deploy: pull → env → redeploy → verify
#
# Usage (on server):
#   bash scripts/deploy-action-plan-production.sh
#
# Optional:
#   REPO=/root/apps/shuleplus/ShulePlus bash scripts/deploy-action-plan-production.sh
#   SKIP_PULL=1 bash scripts/deploy-action-plan-production.sh   # env + redeploy only
#   SKIP_STASH=1 bash scripts/deploy-action-plan-production.sh # fail if local edits block pull
set -euo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
LOG="${LOG:-/tmp/deploy-action-plan.log}"
BRANCH="${BRANCH:-main}"

MOD="ActionPlanMIS"
BDIR="$REPO/$MOD/Backend"
FDIR="$REPO/$MOD/Frontend"
AUTH_ENV="$REPO/Authentication/Backend/.env"

FE_HOST="action-plan.shuleplus.rw"
API_HOST="action-plan-api.shuleplus.rw"
IAM_PUBLIC="https://shuleplus.rw"
IAM_API_PUBLIC="https://shuleplus.rw/api/v1"

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG"; }

require_file() {
  if [ ! -f "$1" ]; then
    log "ERROR: missing file $1"
    exit 1
  fi
}

set_env_var() {
  local file="$1"
  local key="$2"
  local val="$3"
  touch "$file"
  if grep -q "^${key}=" "$file"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$file"
  else
    echo "${key}=${val}" >> "$file"
  fi
}

# ── 1) Pull latest code ──────────────────────────────────────────────────────
log "===== Action Plan MIS production deploy ====="
log "Repo: $REPO | Log: $LOG"

if [ "${SKIP_PULL:-0}" != "1" ]; then
  cd "$REPO"
  if [ "${SKIP_STASH:-0}" != "1" ] && ! git diff --quiet 2>/dev/null; then
    log "Local changes detected — stashing before pull..."
    git stash push -m "deploy-action-plan-$(date +%Y%m%d-%H%M%S)" --include-untracked || true
  fi
  log "git pull origin $BRANCH ..."
  git pull origin "$BRANCH"
  log "Latest commit: $(git log -1 --oneline)"
else
  log "SKIP_PULL=1 — using current checkout"
fi

require_file "$REPO/scripts/redeploy-module.sh"

# ── 2) Backend .env ──────────────────────────────────────────────────────────
log "Configuring ActionPlanMIS Backend .env ..."
require_file "$BDIR/.env.example"
[ -f "$BDIR/.env" ] || cp "$BDIR/.env.example" "$BDIR/.env"

if [ ! -f "$AUTH_ENV" ]; then
  log "WARN: $AUTH_ENV not found — JWT keys must be set manually"
  AUTH_JWT=""
  AUTH_KEY=""
else
  AUTH_JWT=$(grep '^JWT_ACCESS_SECRET=' "$AUTH_ENV" | head -1 | cut -d= -f2- || true)
  AUTH_KEY=$(grep -E '^(PLATFORM_SERVICE_KEY|MODULE_PROVISIONING_KEY)=' "$AUTH_ENV" | head -1 | cut -d= -f2- || true)
fi

CORS="https://${FE_HOST},https://${API_HOST},https://shuleplus.rw,https://app.shuleplus.rw,https://www.shuleplus.rw"

set_env_var "$BDIR/.env" NODE_ENV production
set_env_var "$BDIR/.env" PORT 4009
set_env_var "$BDIR/.env" API_PREFIX /api
set_env_var "$BDIR/.env" MODULE_SLUG action-plan
set_env_var "$BDIR/.env" UPLOAD_DIR uploads
set_env_var "$BDIR/.env" CORS_ORIGIN "$CORS"
set_env_var "$BDIR/.env" FRONTEND_URL "https://${FE_HOST}"
set_env_var "$BDIR/.env" PUBLIC_BASE_URL "https://${API_HOST}"
set_env_var "$BDIR/.env" IAM_API_URL "http://localhost:4001/api/v1"
set_env_var "$BDIR/.env" BUDGET_API_URL "http://localhost:4004/api"
set_env_var "$BDIR/.env" HR_API_URL "http://localhost:4007/api"

if [ -n "$AUTH_JWT" ]; then
  set_env_var "$BDIR/.env" JWT_ACCESS_SECRET "$AUTH_JWT"
fi
if [ -n "$AUTH_KEY" ]; then
  set_env_var "$BDIR/.env" PLATFORM_SERVICE_KEY "$AUTH_KEY"
  set_env_var "$BDIR/.env" SERVICE_API_KEY "$AUTH_KEY"
fi

mkdir -p "$BDIR/uploads"

if ! grep -q '^DATABASE_URL=' "$BDIR/.env"; then
  log "ERROR: DATABASE_URL missing in $BDIR/.env — add it before continuing"
  exit 1
fi

log "Backend URLs:"
grep -E '^(NODE_ENV|PORT|CORS_ORIGIN|FRONTEND_URL|PUBLIC_BASE_URL|IAM_API_URL|BUDGET_API_URL|HR_API_URL|UPLOAD_DIR)=' "$BDIR/.env" | tee -a "$LOG"

# ── 3) Frontend .env.production ──────────────────────────────────────────────
log "Configuring ActionPlanMIS Frontend .env.production ..."
rm -f "$FDIR/.env.local" "$FDIR/.env.development.local"
cat > "$FDIR/.env.production" <<EOF
NEXT_PUBLIC_API_URL=https://${API_HOST}/api
NEXT_PUBLIC_IAM_URL=${IAM_PUBLIC}
NEXT_PUBLIC_IAM_API_URL=${IAM_API_PUBLIC}
NEXT_PUBLIC_MODULE_NAME=Action Plans
EOF
cp -f "$FDIR/.env.production" "$FDIR/.env.production.local"
log "Frontend URLs:"
cat "$FDIR/.env.production" | tee -a "$LOG"

# ── 4) Redeploy module ───────────────────────────────────────────────────────
log "Redeploying $MOD (npm install + build + pm2) — do NOT interrupt..."
bash "$REPO/scripts/redeploy-module.sh" true "$MOD" | tee -a "$LOG"

pm2 save >/dev/null 2>&1 || true

# ── 5) Verify ─────────────────────────────────────────────────────────────────
log "Verifying deployment ..."

API_OK=0
FE_OK=0

if curl -sf --max-time 15 "https://${API_HOST}/api/health" >/dev/null 2>&1 \
  || curl -sf --max-time 15 "http://127.0.0.1:4009/api/health" >/dev/null 2>&1 \
  || curl -sf --max-time 15 "http://127.0.0.1:4009/health" >/dev/null 2>&1; then
  API_OK=1
  log "OK  action-plan-api health"
else
  log "FAIL action-plan-api health"
  pm2 logs action-plan-api --lines 25 --nostream 2>/dev/null | tail -25 | tee -a "$LOG" || true
fi

FE_CODE=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 15 "https://${FE_HOST}/" 2>/dev/null || echo "000")
if [ "$FE_CODE" = "200" ] || [ "$FE_CODE" = "307" ] || [ "$FE_CODE" = "308" ]; then
  FE_OK=1
  log "OK  action-plan-web HTTP $FE_CODE"
else
  log "FAIL action-plan-web HTTP $FE_CODE"
  pm2 logs action-plan-web --lines 25 --nostream 2>/dev/null | tail -25 | tee -a "$LOG" || true
fi

pm2 list | grep -E 'action-plan-api|action-plan-web' | tee -a "$LOG" || true

log "===== Done ====="
log "UI:  https://${FE_HOST}"
log "API: https://${API_HOST}/api/health"
log "Log: $LOG"

if [ "$API_OK" -eq 1 ] && [ "$FE_OK" -eq 1 ]; then
  exit 0
fi
exit 1
