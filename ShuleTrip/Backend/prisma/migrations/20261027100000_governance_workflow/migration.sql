-- Sequential governance workflow
ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "current_stage_key" TEXT NOT NULL DEFAULT 'intake';

ALTER TABLE "trip_approvals" ADD COLUMN IF NOT EXISTS "official_role" TEXT;
ALTER TABLE "trip_approvals" ADD COLUMN IF NOT EXISTS "authority_office" TEXT;
ALTER TABLE "trip_approvals" ADD COLUMN IF NOT EXISTS "signature_name" TEXT;
ALTER TABLE "trip_approvals" ADD COLUMN IF NOT EXISTS "stamp_reference" TEXT;

UPDATE "trips" SET "current_stage_key" = 'intake', "status" = 'VALIDATION'
WHERE "status" = 'SUBMITTED';

UPDATE "trips" SET "current_stage_key" = 'education'
WHERE "status" = 'UNDER_REVIEW' AND "current_stage_key" = 'intake';

UPDATE "trips" SET "current_stage_key" = 'final'
WHERE "status" = 'AWAITING_ADDITIONAL_APPROVAL';
