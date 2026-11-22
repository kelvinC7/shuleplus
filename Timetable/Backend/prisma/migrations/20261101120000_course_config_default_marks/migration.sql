-- Master default marks per course (Academic report cards)
ALTER TABLE "timetable_course_config"
ADD COLUMN IF NOT EXISTS "default_course_marks" DECIMAL(65,30);
