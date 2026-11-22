ALTER TABLE "report_card_publications"
ADD COLUMN IF NOT EXISTS "report_kind" TEXT NOT NULL DEFAULT 'standard';

ALTER TABLE "report_card_publications"
DROP CONSTRAINT IF EXISTS "report_card_publications_organization_id_student_id_class_id_key";

ALTER TABLE "report_card_publications"
DROP CONSTRAINT IF EXISTS "report_card_publications_organization_id_student_id_class_id_academic_year_term_key";

CREATE UNIQUE INDEX IF NOT EXISTS "report_card_publications_org_student_class_year_term_kind_key"
ON "report_card_publications" ("organization_id", "student_id", "class_id", "academic_year", "term", "report_kind");
