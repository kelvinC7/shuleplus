ALTER TABLE "timetable_course_config"
ADD COLUMN IF NOT EXISTS "is_core" BOOLEAN NOT NULL DEFAULT true;
