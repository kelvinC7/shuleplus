ALTER TABLE "generated_lesson_plans" ADD COLUMN IF NOT EXISTS "academic_year" TEXT;
ALTER TABLE "generated_lesson_plans" ADD COLUMN IF NOT EXISTS "subject_label" TEXT;
ALTER TABLE "generated_lesson_plans" ADD COLUMN IF NOT EXISTS "grade_label" TEXT;
ALTER TABLE "generated_lesson_plans" ADD COLUMN IF NOT EXISTS "class_name" TEXT;
ALTER TABLE "generated_lesson_plans" ADD COLUMN IF NOT EXISTS "male_learners" INTEGER;
ALTER TABLE "generated_lesson_plans" ADD COLUMN IF NOT EXISTS "female_learners" INTEGER;
ALTER TABLE "generated_lesson_plans" ADD COLUMN IF NOT EXISTS "taught_at" TIMESTAMP(3);
ALTER TABLE "generated_lesson_plans" ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3);
ALTER TABLE "generated_lesson_plans" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "generated_lesson_plans_org_teacher_status_idx"
  ON "generated_lesson_plans"("organization_id", "teacher_id", "status");
