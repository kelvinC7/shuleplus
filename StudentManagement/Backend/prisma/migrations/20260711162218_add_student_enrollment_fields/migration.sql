-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN     "joining_date" TIMESTAMP(3),
ADD COLUMN     "term" TEXT;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "allergies" TEXT,
ADD COLUMN     "blood_group" TEXT,
ADD COLUMN     "former_school" TEXT,
ADD COLUMN     "leaving_reason" TEXT;
