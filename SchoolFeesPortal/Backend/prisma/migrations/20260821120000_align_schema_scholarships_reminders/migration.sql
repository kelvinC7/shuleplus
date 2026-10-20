-- Align production DB with Prisma schema (columns added after init without a migration).
-- Missing scholarship columns caused GET /dashboard to return 500 → Access Denied.

DO $$ BEGIN
  CREATE TYPE "FeeItemSource" AS ENUM ('SCHOOL', 'BABYEYI');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "fee_structure_items" ADD COLUMN IF NOT EXISTS "source" "FeeItemSource" NOT NULL DEFAULT 'SCHOOL';
ALTER TABLE "fee_structure_items" ADD COLUMN IF NOT EXISTS "payment_type" TEXT NOT NULL DEFAULT 'SCHOOL_ACCOUNT';
ALTER TABLE "fee_structure_items" ADD COLUMN IF NOT EXISTS "external_key" TEXT;

ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "coverage_type" TEXT NOT NULL DEFAULT 'PERCENTAGE';
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "coverage_percent" DECIMAL(5,2);
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "coverage_amount" DECIMAL(14,2);
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "fee_items" JSONB;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "approved_by" TEXT;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3);
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "rejected_reason" TEXT;
ALTER TABLE "scholarships" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

CREATE TABLE IF NOT EXISTS "reminder_automations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "timing_days" INTEGER NOT NULL DEFAULT 3,
    "timing_type" TEXT NOT NULL DEFAULT 'before',
    "audience" TEXT NOT NULL DEFAULT 'parents_outstanding',
    "channels" JSONB NOT NULL,
    "templates" JSONB NOT NULL,
    "escalation" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "last_run_at" TIMESTAMP(3),
    "last_error" TEXT,
    "max_sms_per_day" INTEGER NOT NULL DEFAULT 1,
    "max_sms_per_week" INTEGER NOT NULL DEFAULT 3,
    "quiet_hours_start" INTEGER,
    "quiet_hours_end" INTEGER,
    "combine_siblings" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reminder_automations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "reminder_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reminder_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "reminder_deliveries" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "automation_id" TEXT,
    "parent_id" TEXT,
    "parent_name" TEXT,
    "student_id" TEXT,
    "student_name" TEXT,
    "channel" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "template_name" TEXT,
    "message" TEXT,
    "provider_ref" TEXT,
    "metadata" JSONB,
    "queued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "failed_reason" TEXT,
    CONSTRAINT "reminder_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "reminder_automations_organization_id_status_idx" ON "reminder_automations"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "reminder_templates_organization_id_channel_idx" ON "reminder_templates"("organization_id", "channel");
CREATE INDEX IF NOT EXISTS "reminder_deliveries_organization_id_queued_at_idx" ON "reminder_deliveries"("organization_id", "queued_at");
CREATE INDEX IF NOT EXISTS "reminder_deliveries_organization_id_status_idx" ON "reminder_deliveries"("organization_id", "status");

DO $$ BEGIN
  ALTER TABLE "reminder_deliveries"
    ADD CONSTRAINT "reminder_deliveries_automation_id_fkey"
    FOREIGN KEY ("automation_id") REFERENCES "reminder_automations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
