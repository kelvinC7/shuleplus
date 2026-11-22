-- CreateEnum
CREATE TYPE "ExaminationAttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- CreateTable
CREATE TABLE "examination_attendance" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "examination_list_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "student_code" TEXT,
    "student_name" TEXT NOT NULL,
    "class_id" TEXT,
    "class_name" TEXT,
    "exam_date" TIMESTAMP(3) NOT NULL,
    "session" "ExaminationSessionPeriod" NOT NULL,
    "status" "ExaminationAttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "marked_by_user_id" TEXT,
    "marked_by_name" TEXT,
    "marked_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "examination_attendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "examination_attendance_examination_list_id_room_id_exam_date_session_student_id_key" ON "examination_attendance"("examination_list_id", "room_id", "exam_date", "session", "student_id");
CREATE INDEX "examination_attendance_organization_id_examination_list_id_exam_date_session_idx" ON "examination_attendance"("organization_id", "examination_list_id", "exam_date", "session");
CREATE INDEX "examination_attendance_room_id_exam_date_session_idx" ON "examination_attendance"("room_id", "exam_date", "session");

ALTER TABLE "examination_attendance" ADD CONSTRAINT "examination_attendance_examination_list_id_fkey" FOREIGN KEY ("examination_list_id") REFERENCES "examination_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "examination_attendance" ADD CONSTRAINT "examination_attendance_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "examination_list_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
