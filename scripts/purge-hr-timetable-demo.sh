#!/usr/bin/env bash
# Purge HR sample employees and Timetable demo data on the server (production-safe with --dry-run first).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DRY=()
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY=(--dry-run)
  shift
fi
ORG=()
if [[ "${1:-}" == "--org" && -n "${2:-}" ]]; then
  ORG=(--org "$2")
fi

echo "=== HR: purge sample employees ==="
(cd "$ROOT/HR/Backend" && npx tsx scripts/purge-sample-employees.ts "${DRY[@]}" "${ORG[@]}")

echo "=== Timetable: purge demo timetable ==="
(cd "$ROOT/Timetable/Backend" && npx tsx scripts/purge-demo-timetable.ts "${DRY[@]}" "${ORG[@]}")

echo "Done. Ensure HR_SEED_DEMO and TIMETABLE_SEED_DEMO are not 'true' in production .env."
