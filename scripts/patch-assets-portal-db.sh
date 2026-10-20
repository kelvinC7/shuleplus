#!/bin/bash
# Apply Assets Portal schema patches Prisma db push may miss on existing DBs.
# Reads DATABASE_URL from AssetsPortal/Backend/.env
set -euo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
ENV_FILE="$REPO/AssetsPortal/Backend/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "patch-assets-portal-db: missing $ENV_FILE" >&2
  exit 1
fi

DATABASE_URL="$(grep '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"')"
if [ -z "$DATABASE_URL" ]; then
  echo "patch-assets-portal-db: DATABASE_URL not set in .env" >&2
  exit 1
fi

# psql/libpq rejects Prisma query params like ?connection_limit=2
PSQL_URL="${DATABASE_URL%%\?*}"

echo "patch-assets-portal-db: patching asset_maintenance on ${PSQL_URL%%@*}@…"

psql "$PSQL_URL" -v ON_ERROR_STOP=1 <<'SQL'
ALTER TABLE "asset_maintenance" ADD COLUMN IF NOT EXISTS "provider" TEXT DEFAULT 'Internal';
ALTER TABLE "asset_maintenance" ADD COLUMN IF NOT EXISTS "priority" TEXT;
ALTER TABLE "asset_maintenance" ADD COLUMN IF NOT EXISTS "due_date" TIMESTAMP(3);
ALTER TABLE "asset_maintenance" ADD COLUMN IF NOT EXISTS "estimated_cost" DOUBLE PRECISION;
ALTER TABLE "asset_maintenance" ADD COLUMN IF NOT EXISTS "extension_log" JSONB;
ALTER TABLE "asset_register" ADD COLUMN IF NOT EXISTS "location_label" TEXT NOT NULL DEFAULT '';
ALTER TABLE "asset_register" ADD COLUMN IF NOT EXISTS "original_total_balance" DOUBLE PRECISION;
ALTER TABLE "asset_register" ADD COLUMN IF NOT EXISTS "original_accumulated_dep" DOUBLE PRECISION;
ALTER TABLE "asset_register" ADD COLUMN IF NOT EXISTS "original_dep_rate" DOUBLE PRECISION;

DO $$ BEGIN
  CREATE TYPE "AssetAdjustmentType" AS ENUM (
    'cost_increase',
    'cost_decrease',
    'accumulated_dep_increase',
    'accumulated_dep_decrease',
    'annual_dep_increase',
    'annual_dep_decrease'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "asset_adjustments" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "asset_id" TEXT NOT NULL,
  "asset_code" TEXT NOT NULL,
  "register_year" INTEGER NOT NULL,
  "adjustment_type" "AssetAdjustmentType" NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "reason" TEXT NOT NULL,
  "note" TEXT,
  "adjustment_date" TIMESTAMP(3) NOT NULL,
  "previous_value" DOUBLE PRECISION,
  "new_value" DOUBLE PRECISION,
  "created_by_user_id" TEXT NOT NULL,
  "created_by_email" TEXT,
  "created_by_name" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asset_adjustments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "asset_adjustments_organization_id_asset_code_idx"
  ON "asset_adjustments"("organization_id", "asset_code");
CREATE INDEX IF NOT EXISTS "asset_adjustments_organization_id_asset_id_idx"
  ON "asset_adjustments"("organization_id", "asset_id");
CREATE INDEX IF NOT EXISTS "asset_adjustments_organization_id_asset_code_register_year_idx"
  ON "asset_adjustments"("organization_id", "asset_code", "register_year");

DO $$ BEGIN
  ALTER TABLE "asset_adjustments"
    ADD CONSTRAINT "asset_adjustments_asset_id_fkey"
    FOREIGN KEY ("asset_id") REFERENCES "asset_register"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
SQL

echo "patch-assets-portal-db: done"
