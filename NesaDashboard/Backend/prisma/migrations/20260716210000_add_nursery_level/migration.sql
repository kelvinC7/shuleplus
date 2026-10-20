-- Add NURSERY to EducationLevel enum (fee policies + GA level matching)
ALTER TYPE "EducationLevel" RENAME TO "EducationLevel_old";
CREATE TYPE "EducationLevel" AS ENUM ('NURSERY', 'PRIMARY', 'SECONDARY', 'TVET');
ALTER TABLE "fee_policies" ALTER COLUMN "educationLevel" TYPE "EducationLevel" USING ("educationLevel"::text::"EducationLevel");
DROP TYPE "EducationLevel_old";
