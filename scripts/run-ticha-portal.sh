#!/usr/bin/env bash
# Run TichaPortal locally (BFF :4000 + Vite :5173) with linked module env.
# Usage:
#   bash scripts/run-ticha-portal.sh          # dev — backend + frontend
#   bash scripts/run-ticha-portal.sh backend  # BFF only
#   bash scripts/run-ticha-portal.sh check    # probe upstream module links
#
# Production on server:
#   bash scripts/redeploy-module.sh true TichaPortal
#   pm2 logs ticha-api
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
BDIR="$REPO/TichaPortal/backend"
FDIR="$REPO/TichaPortal"
AUTH_ENV="$REPO/Authentication/Backend/.env"
MODE="${1:-dev}"

write_local_backend_env() {
  local env_file="$BDIR/.env"
  if [ ! -f "$env_file" ] && [ -f "$BDIR/.env.example" ]; then
    cp "$BDIR/.env.example" "$env_file"
    echo "[ticha] created $env_file from .env.example"
  fi
  [ -f "$env_file" ] || { echo "Missing $env_file"; exit 1; }

  set_kv() {
    local key="$1" val="$2"
    if grep -q "^${key}=" "$env_file"; then
      sed -i "s|^${key}=.*|${key}=${val}|" "$env_file"
    else
      echo "${key}=${val}" >> "$env_file"
    fi
  }

  set_kv PORT 4000
  set_kv NODE_ENV development
  set_kv FRONTEND_URL http://localhost:5173
  set_kv CORS_ORIGIN "http://localhost:5173,http://localhost:3000,http://localhost:3053"

  # Local module APIs (docs/PORTS.md)
  set_kv IAM_API_URL http://localhost:3001/api/v1
  set_kv TIMETABLE_API_URL http://localhost:3010/api
  set_kv ACADEMIC_API_URL http://localhost:3003/api
  set_kv STUDENT_MANAGEMENT_API_URL http://localhost:3052/api
  set_kv ATTENDANCE_API_URL http://localhost:3024/api
  set_kv KAZI_API_URL http://localhost:4400
  set_kv HR_API_URL http://localhost:3005/api
  set_kv PAYROLL_API_URL http://localhost:3026/api
  set_kv STUDENT_DISCIPLINE_API_URL http://localhost:3032/api
  set_kv BABYEYI_API_URL http://localhost:3012/api
  set_kv NOTIFICATION_SERVICE_URL http://localhost:3002

  if [ -f "$AUTH_ENV" ]; then
    jwt=$(grep '^JWT_ACCESS_SECRET=' "$AUTH_ENV" | head -1 | cut -d= -f2- || true)
    key=$(grep -E '^(MODULE_PROVISIONING_KEY|PLATFORM_SERVICE_KEY)=' "$AUTH_ENV" | head -1 | cut -d= -f2- || true)
    [ -n "$jwt" ] && set_kv JWT_ACCESS_SECRET "$jwt"
    [ -n "$key" ] && set_kv SERVICE_API_KEY "$key"
  fi
}

write_local_frontend_env() {
  cat > "$FDIR/.env.development" <<'EOF'
VITE_API_URL=
VITE_PROXY_TARGET=http://localhost:4000
VITE_IAM_API_URL=http://localhost:3001/api/v1
VITE_KAZI_API_URL=http://localhost:4400
VITE_TP_API_URL=
VITE_TP_PROXY_TARGET=http://localhost:4000
EOF
}

install_deps() {
  echo "[ticha] npm install (backend)..."
  (cd "$BDIR" && npm install)
  echo "[ticha] npm install (frontend)..."
  (cd "$FDIR" && npm install)
}

run_check() {
  write_local_backend_env
  node "$REPO/scripts/check-ticha-portal-links.mjs" "${TICHA_API_URL:-http://localhost:4000}"
}

run_backend() {
  write_local_backend_env
  install_deps
  echo "[ticha] BFF → http://localhost:4000  (health: /api/health)"
  cd "$BDIR" && npm run dev
}

run_dev() {
  write_local_backend_env
  write_local_frontend_env
  install_deps
  echo "[ticha] Starting BFF + Vite..."
  echo "  Frontend  http://localhost:5173"
  echo "  BFF       http://localhost:4000"
  echo "  Link check: bash scripts/run-ticha-portal.sh check"
  trap 'kill 0' EXIT INT TERM
  (cd "$BDIR" && npm run dev) &
  (cd "$FDIR" && npm run dev) &
  wait
}

case "$MODE" in
  backend|be|api) run_backend ;;
  check|links|probe) run_check ;;
  dev|*) run_dev ;;
esac
