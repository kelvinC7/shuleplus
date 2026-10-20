CREATE TABLE IF NOT EXISTS "report_card_publications" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "class_name" TEXT,
    "student_name" TEXT,
    "student_code" TEXT,
    "academic_year" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_by" TEXT,
    "published_by_name" TEXT,

    CONSTRAINT "report_card_publications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "report_card_publications_organization_id_student_id_class_id_academic_year_term_key"
ON "report_card_publications"("organization_id", "student_id", "class_id", "academic_year", "term");

CREATE INDEX IF NOT EXISTS "report_card_publications_organization_id_class_id_academic_year_term_idx"
ON "report_card_publications"("organization_id", "class_id", "academic_year", "term");

CREATE INDEX IF NOT EXISTS "report_card_publications_organization_id_academic_year_term_published_at_idx"
ON "report_card_publications"("organization_id", "academic_year", "term", "published_at");

ALTER TABLE "report_card_publications" ADD CONSTRAINT "report_card_publications_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
