-- Examination Types: code/status/createdBy + proper cascade deletion.
ALTER TABLE "examination_types" ADD COLUMN "code" TEXT;
ALTER TABLE "examination_types" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "examination_types" ADD COLUMN "created_by" TEXT;
CREATE UNIQUE INDEX "examination_types_organization_id_code_key" ON "examination_types"("organization_id","code");

ALTER TABLE "class_examination_timetables" DROP CONSTRAINT "class_examination_timetables_examination_type_id_fkey";
ALTER TABLE "class_examination_timetables"
  ADD CONSTRAINT "class_examination_timetables_examination_type_id_fkey"
  FOREIGN KEY ("examination_type_id") REFERENCES "examination_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "examination_lists" DROP CONSTRAINT "examination_lists_examination_type_id_fkey";
ALTER TABLE "examination_lists"
  ADD CONSTRAINT "examination_lists_examination_type_id_fkey"
  FOREIGN KEY ("examination_type_id") REFERENCES "examination_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Part-3: separate course-session relationship; one session can hold many courses.
CREATE TABLE "class_examination_slot_courses" (
    "id" TEXT NOT NULL,
    "slot_id" TEXT NOT NULL,
    "course_name" TEXT NOT NULL,
    "subject_id" TEXT,
    "course_code" TEXT,
    "teacher_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "class_examination_slot_courses_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "class_examination_slot_courses_slot_id_course_name_key" ON "class_examination_slot_courses"("slot_id", "course_name");
CREATE INDEX "class_examination_slot_courses_slot_id_idx" ON "class_examination_slot_courses"("slot_id");
ALTER TABLE "class_examination_slot_courses"
  ADD CONSTRAINT "class_examination_slot_courses_slot_id_fkey"
  FOREIGN KEY ("slot_id") REFERENCES "class_examination_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill one course-session row per existing slot (existing data preserved).
INSERT INTO "class_examination_slot_courses" ("id","slot_id","course_name","created_at","updated_at")
SELECT gen_random_uuid(), "id", "course_name", now(), now()
FROM "class_examination_slots"
WHERE "course_name" IS NOT NULL AND "course_name" <> '';

-- Part-5: remember class level (no stream) for room-allocation validation.
ALTER TABLE "examination_allocations" ADD COLUMN "class_level" TEXT;
