-- Remap any TSS policies to TVET, then drop TSS from EducationLevel enum
UPDATE "fee_policies" SET "educationLevel" = 'TVET' WHERE "educationLevel" = 'TSS';

-- Replace TSS with TVET inside General Assembly levels JSON arrays
UPDATE "general_assembly_policies"
SET "levels" = (
  SELECT COALESCE(jsonb_agg(DISTINCT CASE WHEN elem = '"TSS"' THEN '"TVET"' ELSE elem END), '[]'::jsonb)
  FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof("levels"::jsonb) = 'array' THEN "levels"::jsonb ELSE '[]'::jsonb END) AS t(elem)
)::json
WHERE "levels"::text LIKE '%TSS%';

ALTER TYPE "EducationLevel" RENAME TO "EducationLevel_old";
CREATE TYPE "EducationLevel" AS ENUM ('PRIMARY', 'SECONDARY', 'TVET');
ALTER TABLE "fee_policies" ALTER COLUMN "educationLevel" TYPE "EducationLevel" USING ("educationLevel"::text::"EducationLevel");
DROP TYPE "EducationLevel_old";
