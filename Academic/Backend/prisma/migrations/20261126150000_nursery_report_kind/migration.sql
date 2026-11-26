-- Nursery reports per reporting stage (beginning term / mid-term / termly). Additive only.

ALTER TABLE "nursery_reports"
ADD COLUMN IF NOT EXISTS "report_kind" TEXT NOT NULL DEFAULT 'standard';

DROP INDEX IF EXISTS "nursery_reports_organization_id_student_id_class_id_academic_year_term_key";

CREATE UNIQUE INDEX IF NOT EXISTS "nursery_reports_student_term_kind_key"
ON "nursery_reports" ("organization_id", "student_id", "class_id", "academic_year", "term", "report_kind");

CREATE INDEX IF NOT EXISTS "nursery_reports_organization_id_class_id_academic_year_term_report_kind_idx"
ON "nursery_reports" ("organization_id", "class_id", "academic_year", "term", "report_kind");

CREATE INDEX IF NOT EXISTS "nursery_reports_organization_id_academic_year_term_report_kind_idx"
ON "nursery_reports" ("organization_id", "academic_year", "term", "report_kind");
