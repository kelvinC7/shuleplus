-- Assessment templates: default total marks per course (schema field defaultCourseMarks)
ALTER TABLE "assessment_templates"
  ADD COLUMN IF NOT EXISTS "default_course_marks" DECIMAL(65,30) DEFAULT 100;
