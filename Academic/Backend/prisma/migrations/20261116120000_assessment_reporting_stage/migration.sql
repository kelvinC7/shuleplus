DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AssessmentReportingStage') THEN
    CREATE TYPE "AssessmentReportingStage" AS ENUM ('UNASSIGNED', 'BEGINNING_TERM', 'MID_TERM', 'TERM_FINAL');
  END IF;
END
$$;

ALTER TABLE "assessments"
ADD COLUMN IF NOT EXISTS "reporting_stage" "AssessmentReportingStage" NOT NULL DEFAULT 'UNASSIGNED';

CREATE INDEX IF NOT EXISTS "assessments_reporting_stage_idx"
ON "assessments" ("reporting_stage");

ALTER TABLE "assessment_components"
ADD COLUMN IF NOT EXISTS "assessment_category" TEXT;

ALTER TABLE "assessment_components"
ADD COLUMN IF NOT EXISTS "reporting_stage" "AssessmentReportingStage" NOT NULL DEFAULT 'UNASSIGNED';
