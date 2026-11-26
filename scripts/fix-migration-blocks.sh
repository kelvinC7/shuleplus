#!/usr/bin/env bash
# Clear failed Prisma migration records on production, then apply pending migrations.
#
# Run once when `prisma migrate deploy` fails with P3009:
#   cd /root/apps/shuleplus/ShulePlus
#   git pull --ff-only origin main
#   bash scripts/fix-migration-blocks.sh
#
set -euo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
cd "$REPO" || exit 1

echo "===== Fix IAM migrations ====="
cd "$REPO/Authentication/Backend"
npx tsx scripts/fix-iam-migrations.ts

echo ""
echo "===== Fix Timetable migrations ====="
cd "$REPO/Timetable/Backend"
npx tsx scripts/fix-timetable-migrations.ts

echo ""
echo "===== HR migrate status (usually already clean) ====="
cd "$REPO/HR/Backend"
npx prisma migrate deploy || true

echo ""
echo "===== Done — run staff ID data migration next ====="
echo "  bash scripts/migrate-all-staff-ids.sh --dry-run"
echo "  bash scripts/migrate-all-staff-ids.sh"
