-- Nursery academic reports (additive only)

ALTER TABLE "tenants"
ADD COLUMN IF NOT EXISTS "nursery_report_settings" JSONB;

ALTER TABLE "grading_scales"
ADD COLUMN IF NOT EXISTS "color" TEXT;

CREATE TABLE IF NOT EXISTS "nursery_class_configs" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "class_id" TEXT NOT NULL,
  "class_name" TEXT,
  "academic_year" TEXT NOT NULL,
  "template_key" TEXT NOT NULL DEFAULT 'nursery-standard',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "nursery_class_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "nursery_class_configs_organization_id_class_id_academic_year_key"
  ON "nursery_class_configs" ("organization_id", "class_id", "academic_year");
CREATE INDEX IF NOT EXISTS "nursery_class_configs_organization_id_academic_year_idx"
  ON "nursery_class_configs" ("organization_id", "academic_year");

CREATE TABLE IF NOT EXISTS "nursery_subject_configs" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "class_id" TEXT NOT NULL,
  "subject_id" TEXT NOT NULL,
  "subject_name" TEXT,
  "learning_area" TEXT NOT NULL,
  "max_mark" DOUBLE PRECISION NOT NULL DEFAULT 100,
  "is_visible" BOOLEAN NOT NULL DEFAULT true,
  "contributes_to_total" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "nursery_subject_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "nursery_subject_configs_organization_id_class_id_subject_id_key"
  ON "nursery_subject_configs" ("organization_id", "class_id", "subject_id");
CREATE INDEX IF NOT EXISTS "nursery_subject_configs_organization_id_class_id_idx"
  ON "nursery_subject_configs" ("organization_id", "class_id");

CREATE TABLE IF NOT EXISTS "nursery_reports" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "class_id" TEXT NOT NULL,
  "academic_year" TEXT NOT NULL,
  "term" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'GENERATED',
  "student_name" TEXT,
  "class_name" TEXT,
  "total_score" DOUBLE PRECISION,
  "average" DOUBLE PRECISION,
  "class_average" DOUBLE PRECISION,
  "teacher_comment" TEXT,
  "head_teacher_comment" TEXT,
  "verification_code" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "generated_by" TEXT,
  "published_at" TIMESTAMP(3),
  "published_by" TEXT,
  "published_by_name" TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "nursery_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "nursery_reports_organization_id_student_id_class_id_academic_year_term_key"
  ON "nursery_reports" ("organization_id", "student_id", "class_id", "academic_year", "term");
CREATE UNIQUE INDEX IF NOT EXISTS "nursery_reports_verification_code_key"
  ON "nursery_reports" ("verification_code");
CREATE INDEX IF NOT EXISTS "nursery_reports_organization_id_class_id_academic_year_term_idx"
  ON "nursery_reports" ("organization_id", "class_id", "academic_year", "term");
CREATE INDEX IF NOT EXISTS "nursery_reports_organization_id_academic_year_term_idx"
  ON "nursery_reports" ("organization_id", "academic_year", "term");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nursery_class_configs_organization_id_fkey'
  ) THEN
    ALTER TABLE "nursery_class_configs"
      ADD CONSTRAINT "nursery_class_configs_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nursery_subject_configs_organization_id_fkey'
  ) THEN
    ALTER TABLE "nursery_subject_configs"
      ADD CONSTRAINT "nursery_subject_configs_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nursery_reports_organization_id_fkey'
  ) THEN
    ALTER TABLE "nursery_reports"
      ADD CONSTRAINT "nursery_reports_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
