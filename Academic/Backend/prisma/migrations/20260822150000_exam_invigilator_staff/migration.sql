-- AlterTable
ALTER TABLE "exam_invigilator_duties" ADD COLUMN IF NOT EXISTS "user_id" TEXT;
ALTER TABLE "exam_invigilator_duties" ADD COLUMN IF NOT EXISTS "email" TEXT;

CREATE INDEX IF NOT EXISTS "exam_invigilator_duties_organization_id_user_id_idx"
  ON "exam_invigilator_duties"("organization_id", "user_id");

-- CreateTable
CREATE TABLE IF NOT EXISTS "exam_invigilator_staff" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "source" TEXT NOT NULL DEFAULT 'STAFF',
    "has_account" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_invigilator_staff_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "exam_invigilator_staff_organization_id_idx"
  ON "exam_invigilator_staff"("organization_id");
CREATE INDEX IF NOT EXISTS "exam_invigilator_staff_organization_id_user_id_idx"
  ON "exam_invigilator_staff"("organization_id", "user_id");
CREATE INDEX IF NOT EXISTS "exam_invigilator_staff_organization_id_email_idx"
  ON "exam_invigilator_staff"("organization_id", "email");

ALTER TABLE "exam_invigilator_staff"
  DROP CONSTRAINT IF EXISTS "exam_invigilator_staff_organization_id_fkey";
ALTER TABLE "exam_invigilator_staff"
  ADD CONSTRAINT "exam_invigilator_staff_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
