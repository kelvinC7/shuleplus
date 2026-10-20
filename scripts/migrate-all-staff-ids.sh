#!/usr/bin/env bash
# Apply DB migrations (Timetable) and normalize existing staff IDs in IAM, HR, and Timetable.
#
# Run on production after deploy:
#   cd /root/apps/shuleplus/ShulePlus
#   chmod +x scripts/migrate-all-staff-ids.sh
#   bash scripts/migrate-all-staff-ids.sh
#
# Preview only:
#   bash scripts/migrate-all-staff-ids.sh --dry-run
#
set -euo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
DRY_RUN=""
for arg in "$@"; do
  if [[ "$arg" == "--dry-run" ]]; then
    DRY_RUN="--dry-run"
  fi
done

cd "$REPO" || exit 1

echo "===== Staff ID migration (IAM + HR + Timetable) ====="
if [[ -n "$DRY_RUN" ]]; then
  echo "(dry-run — no database writes)"
fi

run_migrate() {
  local dir="$1"
  local label="$2"
  if [[ ! -d "$dir" ]]; then
    echo "  skip $label — missing $dir"
    return 0
  fi
  echo ""
  echo ">>> $label ($dir)"
  cd "$REPO/$dir"
  if [[ -f prisma/schema.prisma ]]; then
    echo "  prisma migrate deploy..."
    if ! npx prisma migrate deploy; then
      echo "  ERROR: migrate deploy failed (often P3009 — failed migration in DB)."
      echo "  Run once: bash scripts/fix-migration-blocks.sh"
      echo "  Then re-run this script."
      exit 1
    fi
    npx prisma generate
  fi
  if npm run 2>/dev/null | grep -q ' migrate:staff-ids'; then
    echo "  npm run migrate:staff-ids $DRY_RUN"
    npm run migrate:staff-ids -- $DRY_RUN
  else
    echo "  (no migrate:staff-ids script in package.json)"
  fi
}

run_migrate "Authentication/Backend" "IAM (Users & Access employeeId)"
run_migrate "HR/Backend" "HR (employeeNumber)"
run_migrate "Timetable/Backend" "Timetable (teacher employeeNumber)"

echo ""
echo "===== Done ====="
echo "Verify in app: Organization Admin → Users & Access, HR directory, Timetable teachers."
