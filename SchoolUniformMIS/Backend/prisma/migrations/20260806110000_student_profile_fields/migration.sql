-- AlterTable
ALTER TABLE "uniform_students" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "uniform_students" ADD COLUMN IF NOT EXISTS "profile_meta" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "student_measurements" ADD COLUMN IF NOT EXISTS "weight" DECIMAL(6,2);
ALTER TABLE "student_measurements" ADD COLUMN IF NOT EXISTS "shirt_size" TEXT;
ALTER TABLE "student_measurements" ADD COLUMN IF NOT EXISTS "trouser_size" TEXT;
ALTER TABLE "student_measurements" ADD COLUMN IF NOT EXISTS "skirt_size" TEXT;
ALTER TABLE "student_measurements" ADD COLUMN IF NOT EXISTS "dress_size" TEXT;
ALTER TABLE "student_measurements" ADD COLUMN IF NOT EXISTS "sweater_size" TEXT;
ALTER TABLE "student_measurements" ADD COLUMN IF NOT EXISTS "shoe_size" TEXT;
ALTER TABLE "student_measurements" ADD COLUMN IF NOT EXISTS "sport_size" TEXT;
ALTER TABLE "student_measurements" ADD COLUMN IF NOT EXISTS "hat_size" TEXT;
ALTER TABLE "student_measurements" ADD COLUMN IF NOT EXISTS "belt_size" TEXT;
ALTER TABLE "student_measurements" ADD COLUMN IF NOT EXISTS "history" JSONB NOT NULL DEFAULT '[]';
