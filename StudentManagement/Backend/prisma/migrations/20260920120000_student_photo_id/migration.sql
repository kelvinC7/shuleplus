-- AlterTable
ALTER TABLE "students" ADD COLUMN "photo_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "students_organization_id_photo_id_key" ON "students"("organization_id", "photo_id");

-- CreateIndex
CREATE INDEX "students_organization_id_student_code_idx" ON "students"("organization_id", "student_code");
