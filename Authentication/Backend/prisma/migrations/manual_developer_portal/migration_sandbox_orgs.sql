-- Phase 3: Per-partner sandbox/production organizations
-- Run after migration.sql (idempotent — safe to re-run):
--   psql $DATABASE_URL -f prisma/migrations/manual_developer_portal/migration_sandbox_orgs.sql

DO $do$
BEGIN
  CREATE TYPE "DeveloperProductionAccessStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$do$;

ALTER TABLE "developer_partners"
  ADD COLUMN IF NOT EXISTS "sandbox_organization_id" TEXT,
  ADD COLUMN IF NOT EXISTS "production_organization_id" TEXT,
  ADD COLUMN IF NOT EXISTS "production_access_status" "DeveloperProductionAccessStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "assigned_module_slugs" JSONB NOT NULL DEFAULT '["student-management","school-fees","babyeyi","authentication","webpage-babyeyi"]',
  ADD COLUMN IF NOT EXISTS "sandbox_test_data" JSONB;

-- Multiple partners may share one sandbox school (see migration_shared_sandbox_school.sql).
DROP INDEX IF EXISTS "developer_partners_sandbox_organization_id_key";

CREATE INDEX IF NOT EXISTS "developer_partners_sandbox_organization_id_idx"
  ON "developer_partners"("sandbox_organization_id");

CREATE UNIQUE INDEX IF NOT EXISTS "developer_partners_production_organization_id_key"
  ON "developer_partners"("production_organization_id");

DO $do$
BEGIN
  ALTER TABLE "developer_partners"
    ADD CONSTRAINT "developer_partners_sandbox_organization_id_fkey"
    FOREIGN KEY ("sandbox_organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$do$;

DO $do$
BEGIN
  ALTER TABLE "developer_partners"
    ADD CONSTRAINT "developer_partners_production_organization_id_fkey"
    FOREIGN KEY ("production_organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$do$;

ALTER TABLE "developer_applications"
  ADD COLUMN IF NOT EXISTS "organization_id" TEXT;

CREATE INDEX IF NOT EXISTS "developer_applications_organization_id_idx"
  ON "developer_applications"("organization_id");

CREATE TABLE IF NOT EXISTS "developer_production_access_requests" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "requested_by_user_id" TEXT NOT NULL,
    "status" "DeveloperProductionAccessStatus" NOT NULL DEFAULT 'PENDING',
    "requested_modules" JSONB NOT NULL DEFAULT '[]',
    "business_justification" TEXT,
    "reviewed_by_user_id" TEXT,
    "review_notes" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "developer_production_access_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "developer_production_access_requests_partner_id_status_idx"
  ON "developer_production_access_requests"("partner_id", "status");

DO $do$
BEGIN
  ALTER TABLE "developer_production_access_requests"
    ADD CONSTRAINT "developer_production_access_requests_partner_id_fkey"
    FOREIGN KEY ("partner_id") REFERENCES "developer_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$do$;
