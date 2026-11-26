#!/bin/bash
# Fail if auth-web is not serving CSS with a real text/css body (unstyled landing symptom).
set -uo pipefail

PORT="${AUTH_WEB_PORT:-6100}"
HOST="${APEX_HOST:-shuleplus.rw}"
FDIR="${FDIR:-/root/apps/shuleplus/ShulePlus/Authentication/Frontend}"
RETRIES="${AUTH_STATIC_RETRIES:-5}"
SLEEP="${AUTH_STATIC_SLEEP:-3}"

pick_css_path() {
  local html css_path css_file
  html=$(curl -sS --max-time 15 -H "Host: ${HOST}" "http://127.0.0.1:${PORT}/" 2>/dev/null || true)
  css_path=$(echo "$html" | grep -oE '/_next/static/[^"'\'' ]+\.css' | head -1 || true)
  if [ -n "$css_path" ]; then
    echo "$css_path"
    return 0
  fi

  css_file=$(find "$FDIR/.next/static" -type f -name '*.css' 2>/dev/null | head -1 || true)
  if [ -n "$css_file" ]; then
    echo "/_next/static${css_file#"$FDIR/.next/static"}"
    return 0
  fi
  return 1
}

CSS_PATH=""
for _ in $(seq 1 "$RETRIES"); do
  if CSS_PATH=$(pick_css_path); then
    break
  fi
  sleep "$SLEEP"
done

if [ -z "$CSS_PATH" ]; then
  echo "ERROR: no CSS file under $FDIR/.next/static and none linked from GET / (Host: $HOST)." >&2
  exit 1
fi

URL="http://127.0.0.1:${PORT}${CSS_PATH}"

# Use GET (not HEAD) — Next static file handler often returns 405 for HEAD.
last_code=""
last_type=""
for _ in $(seq 1 "$RETRIES"); do
  headers=$(curl -sS -D - -o /tmp/shuleplus-css-check.out --max-time 15 -H "Host: ${HOST}" "$URL" 2>/dev/null || true)
  last_code=$(echo "$headers" | grep -m1 '^HTTP/' | awk '{print $2}')
  last_type=$(echo "$headers" | awk -F': ' 'tolower($1)=="content-type"{print tolower($2)}' | tr -d '\r' | head -1)
  if [ "$last_code" = "200" ] && echo "$last_type" | grep -q 'text/css'; then
    echo "OK: ${CSS_PATH} HTTP 200, content-type ${last_type}"
    exit 0
  fi
  sleep "$SLEEP"
done

echo "ERROR: GET $URL (Host: $HOST) → HTTP ${last_code:-000}, Content-Type: ${last_type:-unknown} (expected 200 text/css)." >&2
echo "Hint: pm2 logs auth-web --lines 20; ls -la $FDIR/.next/static 2>/dev/null | head" >&2
head -c 200 /tmp/shuleplus-css-check.out 2>/dev/null || true
echo >&2
exit 1
