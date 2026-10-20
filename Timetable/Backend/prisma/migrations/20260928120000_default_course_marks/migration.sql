-- Config Class optional default marks (Academic sync)
ALTER TABLE "teacher_assignments"
ADD COLUMN IF NOT EXISTS "default_course_marks" DECIMAL(65,30);
