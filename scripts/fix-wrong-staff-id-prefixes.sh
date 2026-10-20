#!/usr/bin/env bash
# Re-assign staff IDs whose DD+SSS block does not match the school organization_code (e.g. TR0010… → TR23001…).
#
#   cd /root/apps/shuleplus/ShulePlus
#   git pull --ff-only origin main
#   bash scripts/fix-wrong-staff-id-prefixes.sh --dry-run
#   bash scripts/fix-wrong-staff-id-prefixes.sh
#
set -euo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
DRY=""
for arg in "$@"; do
  if [[ "$arg" == "--dry-run" ]]; then
    DRY="--dry-run"
  fi
done

cd "$REPO" || exit 1

echo "===== 1) Sync IAM organization_code → HR + Timetable tenants ====="
cd "$REPO/Authentication/Backend"
npx tsx scripts/sync-module-tenant-org-codes.ts

echo ""
echo "===== 2) IAM Users & Access (employeeId) ====="
npm run migrate:staff-ids -- --fix-wrong-prefix $DRY

echo ""
echo "===== 3) HR (employeeNumber) ====="
cd "$REPO/HR/Backend"
npm run migrate:staff-ids -- --fix-wrong-prefix $DRY

echo ""
echo "===== 4) Timetable teachers ====="
cd "$REPO/Timetable/Backend"
npm run migrate:staff-ids -- --fix-wrong-prefix $DRY

echo ""
echo "===== 5) PrintCard — drop stale staff rows (TR0010… duplicates) ====="
cd "$REPO/PrintCardMIS/Backend"
if [[ -n "$DRY" ]]; then
  npx tsx scripts/resync-all-staff-cards.ts --dry-run
else
  npx tsx scripts/resync-all-staff-cards.ts
fi

echo ""
if [[ -n "$DRY" ]]; then
  echo "Dry-run complete. Re-run without --dry-run to apply."
else
  echo "Done. Open PrintCard → Staff per school if you need to verify."
  echo "Optional: bash scripts/redeploy-module.sh true PrintCardMIS print-card-api print-card-web"
fi
