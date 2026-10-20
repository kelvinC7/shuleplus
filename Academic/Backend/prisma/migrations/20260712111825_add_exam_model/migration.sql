-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('MIDTERM', 'FINAL', 'ASSIGNMENT', 'QUIZ', 'CAT', 'HOMEWORK', 'PRACTICAL');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('DRAFT', 'UPCOMING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "exams" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ExamType" NOT NULL,
    "academic_year" TEXT NOT NULL,
    "term" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "status" "ExamStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "total_marks" INTEGER,
    "passing_marks" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exams_organization_id_idx" ON "exams"("organization_id");

-- CreateIndex
CREATE INDEX "exams_organization_id_academic_year_idx" ON "exams"("organization_id", "academic_year");

-- CreateIndex
CREATE INDEX "exams_organization_id_status_idx" ON "exams"("organization_id", "status");

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
