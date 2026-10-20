#!/bin/bash
# Toggle nginx edge maintenance for shuleplus.rw (flag file + reload).
# Usage: sudo bash scripts/toggle-nginx-maintenance.sh enable|disable|status
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
MAINT_DIR="${MAINT_DIR:-/var/www/shuleplus/maintenance}"
FLAG="${MAINT_DIR}/ON"
SRC_HTML="${REPO}/config/maintenance/index.html"

cmd="${1:-status}"

ensure_page() {
  mkdir -p "$MAINT_DIR"
  if [ -f "$SRC_HTML" ]; then
    cp "$SRC_HTML" "$MAINT_DIR/index.html"
  elif [ ! -f "$MAINT_DIR/index.html" ]; then
    echo "ShulePlus maintenance" > "$MAINT_DIR/index.html"
  fi
}

case "$cmd" in
  enable|on)
    ensure_page
    touch "$FLAG"
    echo "Maintenance ENABLED — $FLAG exists"
    ;;
  disable|off)
    rm -f "$FLAG"
    echo "Maintenance DISABLED — $FLAG removed"
    ;;
  status)
    if [ -f "$FLAG" ]; then
      echo "Maintenance is ON"
      exit 0
    else
      echo "Maintenance is OFF"
      exit 1
    fi
    ;;
  *)
    echo "Usage: $0 enable|disable|status" >&2
    exit 2
    ;;
esac

if command -v nginx >/dev/null 2>&1; then
  nginx -t && systemctl reload nginx && echo "Nginx reloaded."
else
  echo "nginx not found — flag updated only (local/dev)."
fi
