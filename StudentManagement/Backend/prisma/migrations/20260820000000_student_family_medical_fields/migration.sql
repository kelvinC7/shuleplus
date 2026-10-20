-- AlterTable
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "father_living" BOOLEAN DEFAULT true;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "mother_living" BOOLEAN DEFAULT true;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "has_medical_condition" BOOLEAN DEFAULT false;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "medical_condition_details" TEXT;
