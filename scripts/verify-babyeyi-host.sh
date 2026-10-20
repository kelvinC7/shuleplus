#!/bin/bash
# Detect babyeyi.shuleplus.rw (or local :6116) serving the wrong app (usually Academic).
#
# Exit 0 — BabyeyiWizard (or port empty/unrecognized but not Academic)
# Exit 1 — Academic content detected (needs fix-babyeyi-shuleplus.sh)
# Exit 2 — local port not responding (babyeyi-web may be down)
#
# Usage:
#   bash scripts/verify-babyeyi-host.sh
#   bash scripts/verify-babyeyi-host.sh --public   # also check https://babyeyi.shuleplus.rw
set -uo pipefail

FPORT="${BABYEYI_FRONTEND_PORT:-6116}"
PUBLIC_HOST="${BABYEYI_PUBLIC_HOST:-https://babyeyi.shuleplus.rw}"
CHECK_PUBLIC=false
NGINX_CONF="${NGINX_CONF:-/etc/nginx/sites-available/babyeyi.conf}"

for arg in "$@"; do
  case "$arg" in
    --public) CHECK_PUBLIC=true ;;
  esac
done

is_academic_html() {
  echo "$1" | grep -qi 'Academic Dashboard\|>Academic<\|Subjects.*Examinations.*Marks Entry'
}

is_babyeyi_html() {
  echo "$1" | grep -qi 'Babyeyi Wizard\|Create, manage and publish\|Missing access token\|Verifying license'
}

fail_academic() {
  local where="$1"
  echo "ERROR: ${where} serves Academic instead of BabyeyiWizard" >&2
  return 1
}

LOCAL=$(curl -sf --max-time 8 "http://127.0.0.1:${FPORT}/" 2>/dev/null || true)
if [ -z "$LOCAL" ]; then
  echo "WARN: nothing responding on http://127.0.0.1:${FPORT}/" >&2
  exit 2
fi

if is_academic_html "$LOCAL"; then
  fail_academic ":${FPORT}"
  pm2 describe babyeyi-web 2>/dev/null | head -20 >&2 || true
  pm2 describe academic-web 2>/dev/null | head -20 >&2 || true
  exit 1
fi

if is_babyeyi_html "$LOCAL"; then
  echo "OK: :${FPORT} serves BabyeyiWizard"
else
  echo "WARN: :${FPORT} responds but content is not recognized as BabyeyiWizard" >&2
fi

if [ -f "$NGINX_CONF" ]; then
  if grep -q 'Academic/Frontend_react/dist' "$NGINX_CONF" 2>/dev/null; then
    echo "ERROR: ${NGINX_CONF} points at Academic static root" >&2
    grep -E 'proxy_pass|root' "$NGINX_CONF" >&2 || true
    exit 1
  fi
  if ! grep -q "localhost:${FPORT}" "$NGINX_CONF" 2>/dev/null; then
    echo "WARN: ${NGINX_CONF} may not proxy to :${FPORT}" >&2
    grep -E 'proxy_pass|root' "$NGINX_CONF" >&2 || true
  fi
fi

if [ "$CHECK_PUBLIC" = "true" ]; then
  PUBLIC=$(curl -sfL --max-time 12 "${PUBLIC_HOST}/" 2>/dev/null || true)
  if [ -n "$PUBLIC" ] && is_academic_html "$PUBLIC"; then
    fail_academic "$PUBLIC_HOST"
    [ -f "$NGINX_CONF" ] && grep -E 'proxy_pass|root' "$NGINX_CONF" >&2 || true
    exit 1
  fi
  if is_babyeyi_html "$PUBLIC"; then
    echo "OK: ${PUBLIC_HOST} serves BabyeyiWizard"
  elif [ -n "$PUBLIC" ]; then
    echo "WARN: ${PUBLIC_HOST} responds but content is not recognized" >&2
  fi
fi

exit 0
