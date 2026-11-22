-- AlterEnum
ALTER TYPE "ExaminationListStatus" ADD VALUE IF NOT EXISTS 'PUBLISHED';

-- AlterTable
ALTER TABLE "class_examination_timetables"
ADD COLUMN IF NOT EXISTS "examination_code" TEXT,
ADD COLUMN IF NOT EXISTS "name" TEXT;

-- AlterTable
ALTER TABLE "examination_lists"
ADD COLUMN IF NOT EXISTS "list_code" TEXT,
ADD COLUMN IF NOT EXISTS "examination_timetable_id" TEXT,
ADD COLUMN IF NOT EXISTS "examination_code" TEXT,
ADD COLUMN IF NOT EXISTS "examination_name" TEXT,
ADD COLUMN IF NOT EXISTS "start_date" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "end_date" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "published_at" TIMESTAMP(3);

-- Backfill codes for existing rows
UPDATE "class_examination_timetables"
SET "examination_code" = 'EX-' || upper(substr(replace(id::text, '-', ''), 1, 8))
WHERE "examination_code" IS NULL;

UPDATE "examination_lists"
SET "list_code" = 'EL-' || upper(substr(replace(id::text, '-', ''), 1, 8))
WHERE "list_code" IS NULL;

UPDATE "examination_lists" el
SET "start_date" = cet."start_date",
    "end_date" = cet."end_date",
    "examination_name" = COALESCE(el."name", cet."name", cet."class_name" || ' Examination')
FROM "class_examination_timetables" cet
WHERE el."examination_timetable_id" = cet.id
  AND (el."start_date" IS NULL OR el."end_date" IS NULL);

-- CreateEnum
CREATE TYPE "ExaminationInvigilatorAssignmentType" AS ENUM ('AUTOMATIC', 'MANUAL');

-- CreateEnum
CREATE TYPE "ExaminationInvigilatorAssignmentStatus" AS ENUM ('ASSIGNED', 'PENDING', 'CHECKED_IN', 'REPLACED');

-- CreateTable
CREATE TABLE "examination_invigilator_assignments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "examination_timetable_id" TEXT,
    "examination_list_id" TEXT NOT NULL,
    "examination_code" TEXT,
    "list_code" TEXT,
    "room_id" TEXT NOT NULL,
    "room_name" TEXT NOT NULL,
    "room_number" TEXT,
    "exam_date" TIMESTAMP(3) NOT NULL,
    "session" "ExaminationSessionPeriod" NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "teacher_user_id" TEXT NOT NULL,
    "teacher_name" TEXT NOT NULL,
    "teacher_email" TEXT,
    "assignment_type" "ExaminationInvigilatorAssignmentType" NOT NULL DEFAULT 'AUTOMATIC',
    "status" "ExaminationInvigilatorAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "examination_invigilator_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "class_examination_timetables_examination_code_key" ON "class_examination_timetables"("examination_code");
CREATE INDEX IF NOT EXISTS "class_examination_timetables_organization_id_examination_co_idx" ON "class_examination_timetables"("organization_id", "examination_code");

CREATE UNIQUE INDEX IF NOT EXISTS "examination_lists_list_code_key" ON "examination_lists"("list_code");
CREATE INDEX IF NOT EXISTS "examination_lists_examination_timetable_id_idx" ON "examination_lists"("examination_timetable_id");
CREATE INDEX IF NOT EXISTS "examination_lists_examination_code_idx" ON "examination_lists"("examination_code");

CREATE UNIQUE INDEX IF NOT EXISTS "examination_invigilator_assignments_examination_list_id_roo_key" ON "examination_invigilator_assignments"("examination_list_id", "room_id", "exam_date", "session", "teacher_user_id");
CREATE INDEX IF NOT EXISTS "examination_invigilator_assignments_organization_id_examina_idx" ON "examination_invigilator_assignments"("organization_id", "examination_list_id", "exam_date", "session");
CREATE INDEX IF NOT EXISTS "examination_invigilator_assignments_teacher_user_id_exam_da_idx" ON "examination_invigilator_assignments"("teacher_user_id", "exam_date", "session");
CREATE INDEX IF NOT EXISTS "examination_invigilator_assignments_examination_code_idx" ON "examination_invigilator_assignments"("examination_code");

-- AddForeignKey
ALTER TABLE "examination_lists" ADD CONSTRAINT "examination_lists_examination_timetable_id_fkey" FOREIGN KEY ("examination_timetable_id") REFERENCES "class_examination_timetables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "examination_invigilator_assignments" ADD CONSTRAINT "examination_invigilator_assignments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "examination_invigilator_assignments" ADD CONSTRAINT "examination_invigilator_assignments_examination_timetable__fkey" FOREIGN KEY ("examination_timetable_id") REFERENCES "class_examination_timetables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "examination_invigilator_assignments" ADD CONSTRAINT "examination_invigilator_assignments_examination_list_id_fkey" FOREIGN KEY ("examination_list_id") REFERENCES "examination_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "examination_invigilator_assignments" ADD CONSTRAINT "examination_invigilator_assignments_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "examination_list_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
