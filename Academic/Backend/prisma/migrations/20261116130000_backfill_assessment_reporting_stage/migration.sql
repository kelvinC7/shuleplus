-- Backfill reporting stage on existing assessments from their template component.
-- Only assessments still UNASSIGNED are touched; anything already classified (e.g. by an admin) is kept.
UPDATE "assessments" AS a
SET "reporting_stage" = c."reporting_stage"
FROM "assessment_components" AS c
WHERE a."component_id" = c."id"
  AND a."reporting_stage" = 'UNASSIGNED'
  AND c."reporting_stage" <> 'UNASSIGNED';
