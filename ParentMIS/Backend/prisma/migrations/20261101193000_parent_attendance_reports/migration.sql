-- CreateEnum
CREATE TYPE "parent_attendance_report_kind" AS ENUM ('ABSENT', 'LATE');

-- CreateTable
CREATE TABLE "parent_attendance_reports" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "report_date" TIMESTAMP(3) NOT NULL,
    "kind" "parent_attendance_report_kind" NOT NULL,
    "reason" TEXT NOT NULL,
    "detail" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_attendance_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "parent_attendance_reports_organization_id_report_date_idx" ON "parent_attendance_reports"("organization_id", "report_date");

-- CreateIndex
CREATE INDEX "parent_attendance_reports_student_id_report_date_idx" ON "parent_attendance_reports"("student_id", "report_date");

-- AddForeignKey
ALTER TABLE "parent_attendance_reports" ADD CONSTRAINT "parent_attendance_reports_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
