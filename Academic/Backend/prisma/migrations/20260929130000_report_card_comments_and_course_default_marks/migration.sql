-- Report card teacher comments (used when enriching report-card API responses)
CREATE TABLE IF NOT EXISTS "report_card_comments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "term" TEXT NOT NULL DEFAULT 'All',
    "class_teacher_comment" TEXT,
    "head_teacher_comment" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_card_comments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "report_card_comments_organization_id_student_id_class_id_academic_year_term_key"
ON "report_card_comments"("organization_id", "student_id", "class_id", "academic_year", "term");

CREATE INDEX IF NOT EXISTS "report_card_comments_organization_id_class_id_academic_year_term_idx"
ON "report_card_comments"("organization_id", "class_id", "academic_year", "term");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'report_card_comments_organization_id_fkey'
  ) THEN
    ALTER TABLE "report_card_comments" ADD CONSTRAINT "report_card_comments_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Per-subject default course totals (optional overrides for report cards)
CREATE TABLE IF NOT EXISTS "course_default_marks" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "default_course_marks" DECIMAL(65,30) NOT NULL,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_default_marks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "course_default_marks_organization_id_class_id_subject_id_academic_year_term_key"
ON "course_default_marks"("organization_id", "class_id", "subject_id", "academic_year", "term");

CREATE INDEX IF NOT EXISTS "course_default_marks_organization_id_class_id_academic_year_term_idx"
ON "course_default_marks"("organization_id", "class_id", "academic_year", "term");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'course_default_marks_organization_id_fkey'
  ) THEN
    ALTER TABLE "course_default_marks" ADD CONSTRAINT "course_default_marks_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'course_default_marks_class_id_fkey'
  ) THEN
    ALTER TABLE "course_default_marks" ADD CONSTRAINT "course_default_marks_class_id_fkey"
    FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'course_default_marks_subject_id_fkey'
  ) THEN
    ALTER TABLE "course_default_marks" ADD CONSTRAINT "course_default_marks_subject_id_fkey"
    FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
