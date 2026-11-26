#!/bin/bash
# Apply idempotent IAM SQL migrations not yet on production (MFA, SEI/DEO officers, etc.).
#
# Usage:
#   cd ~/apps/shuleplus/ShulePlus
#   bash scripts/apply-iam-pending-migrations.sh
#   pm2 restart auth-api --update-env
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="${REPO:-$(cd "$SCRIPT_DIR/.." && pwd)}"
AUTH_ENV="$REPO/Authentication/Backend/.env"
MIG_ROOT="$REPO/Authentication/Backend/prisma/migrations"

if [ ! -f "$AUTH_ENV" ]; then
  echo "ERROR: missing $AUTH_ENV" >&2
  exit 1
fi

DATABASE_URL=$(grep '^DATABASE_URL=' "$AUTH_ENV" | head -1 | cut -d= -f2- | tr -d '"'"'")
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL not set in $AUTH_ENV" >&2
  exit 1
fi

PSQL_URL="${DATABASE_URL%%\?*}"

run_migration() {
  local rel="$1"
  local path="$MIG_ROOT/$rel"
  if [ ! -f "$path" ]; then
    echo "WARN: skip missing $path" >&2
    return 0
  fi
  echo ">>> $rel"
  psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f "$path"
}

# Order matters where tables depend on enums from earlier files.
run_migration "20260915120000_chief_accountant/migration.sql"
run_migration "20261003100000_sei_officers/migration.sql"
run_migration "20261005100000_deo_officers/migration.sql"

echo ""
echo ">>> Verifying mfa_sessions.verification_step"
psql "$PSQL_URL" -c \
  "SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'mfa_sessions'
     AND column_name = 'verification_step';"

echo ""
echo "OK: IAM pending migrations applied"
echo "Next: pm2 restart auth-api --update-env"
