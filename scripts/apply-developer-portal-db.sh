#!/bin/bash
# Apply Developer Portal SQL migrations to the IAM database.
# Safe to re-run (skips initial migration when tables exist; later files use IF NOT EXISTS).
#
# Usage (on production server):
#   cd ~/apps/shuleplus/ShulePlus
#   bash scripts/apply-developer-portal-db.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="${REPO:-$(cd "$SCRIPT_DIR/.." && pwd)}"
AUTH_ENV="$REPO/Authentication/Backend/.env"
MIG="$REPO/Authentication/Backend/prisma/migrations/manual_developer_portal"

if [ ! -f "$AUTH_ENV" ]; then
  echo "ERROR: missing $AUTH_ENV" >&2
  exit 1
fi

DATABASE_URL=$(grep '^DATABASE_URL=' "$AUTH_ENV" | head -1 | cut -d= -f2- | tr -d '"'"'")
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL not set in $AUTH_ENV" >&2
  exit 1
fi

# Prisma adds ?schema=public — libpq psql does not accept that query param.
PSQL_URL="${DATABASE_URL%%\?*}"

psql_table_exists() {
  local table="$1"
  psql "$PSQL_URL" -tAc \
    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${table}')"
}

if [ "$(psql_table_exists developer_partners)" = "f" ]; then
  echo ">>> migration.sql (initial create)"
  psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f "$MIG/migration.sql"
else
  echo ">>> skip migration.sql (developer_partners already exists)"
fi

for sql in migration_shared_sandbox_school.sql migration_sandbox_orgs.sql migration_portal_settings.sql; do
  path="$MIG/$sql"
  if [ ! -f "$path" ]; then
    echo "WARN: skip missing $path" >&2
    continue
  fi
  echo ">>> $sql"
  psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f "$path"
done

echo ""
echo ">>> Verifying developer_partners columns (sandbox / production)"
psql "$PSQL_URL" -c \
  "SELECT column_name FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'developer_partners'
     AND column_name IN (
       'sandbox_organization_id',
       'production_organization_id',
       'production_access_status',
       'assigned_module_slugs',
       'sandbox_test_data'
     )
   ORDER BY 1;"

echo ""
echo ">>> Verifying developer portal tables"
psql "$PSQL_URL" -c "\dt developer_*"

echo ""
echo "OK: developer portal schema applied"
echo "Next: pm2 restart auth-api --update-env"
