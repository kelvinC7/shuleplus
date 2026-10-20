-- Ensure classrooms + class-QR columns exist (schema drifted ahead of migrations).
CREATE TABLE IF NOT EXISTS "classrooms" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "building" TEXT,
  "floor" TEXT,
  "room_number" TEXT NOT NULL,
  "qr_code" TEXT NOT NULL,
  "source_class_id" TEXT,
  "class_label" TEXT,
  "capacity" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "classrooms_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "classrooms" ADD COLUMN IF NOT EXISTS "source_class_id" TEXT;
ALTER TABLE "classrooms" ADD COLUMN IF NOT EXISTS "class_label" TEXT;
ALTER TABLE "classrooms" ADD COLUMN IF NOT EXISTS "building" TEXT;
ALTER TABLE "classrooms" ADD COLUMN IF NOT EXISTS "floor" TEXT;
ALTER TABLE "classrooms" ADD COLUMN IF NOT EXISTS "capacity" INTEGER;
ALTER TABLE "classrooms" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS "classrooms_qr_code_key" ON "classrooms"("qr_code");
CREATE UNIQUE INDEX IF NOT EXISTS "classrooms_organization_id_room_number_key"
  ON "classrooms"("organization_id", "room_number");
CREATE UNIQUE INDEX IF NOT EXISTS "classrooms_organization_id_source_class_id_key"
  ON "classrooms"("organization_id", "source_class_id")
  WHERE "source_class_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "classrooms_organization_id_idx" ON "classrooms"("organization_id");
