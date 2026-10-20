-- AlterTable
ALTER TABLE "student_measurements" ADD COLUMN IF NOT EXISTS "sizes" JSONB NOT NULL DEFAULT '[]';
