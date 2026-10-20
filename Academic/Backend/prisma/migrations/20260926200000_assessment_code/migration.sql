ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "assessment_code" TEXT;

CREATE INDEX IF NOT EXISTS "assessments_organization_id_assessment_code_idx"
  ON "assessments" ("organization_id", "assessment_code");
