-- AlterTable
ALTER TABLE "records" ADD COLUMN     "event_type" TEXT,
ADD COLUMN     "points" INTEGER DEFAULT 0,
ADD COLUMN     "student_code" TEXT;

-- CreateIndex
CREATE INDEX "records_student_code_idx" ON "records"("student_code");
