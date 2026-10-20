-- CreateEnum
CREATE TYPE "ClassAttendanceStatus" AS ENUM ('DRAFT', 'COMPLETED');

-- CreateTable
CREATE TABLE "class_attendance_sessions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "teacher_user_id" TEXT NOT NULL,
    "teacher_name" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "class_name" TEXT NOT NULL,
    "class_label" TEXT,
    "session_date" DATE NOT NULL,
    "academic_year" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "status" "ClassAttendanceStatus" NOT NULL DEFAULT 'DRAFT',
    "session_notes" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_attendance_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "class_attendance_rows" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "student_id" TEXT,
    "student_code" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "roll_number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNMARKED',
    "notes" TEXT,
    "marked_at" TIMESTAMP(3),

    CONSTRAINT "class_attendance_rows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "class_attendance_sessions_organization_id_class_id_session_date_term_academic_year_key" ON "class_attendance_sessions"("organization_id", "class_id", "session_date", "term", "academic_year");
CREATE INDEX "class_attendance_sessions_organization_id_teacher_user_id_idx" ON "class_attendance_sessions"("organization_id", "teacher_user_id");
CREATE INDEX "class_attendance_sessions_organization_id_class_id_idx" ON "class_attendance_sessions"("organization_id", "class_id");
CREATE UNIQUE INDEX "class_attendance_rows_session_id_student_code_key" ON "class_attendance_rows"("session_id", "student_code");
CREATE INDEX "class_attendance_rows_organization_id_session_id_idx" ON "class_attendance_rows"("organization_id", "session_id");

ALTER TABLE "class_attendance_rows" ADD CONSTRAINT "class_attendance_rows_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "class_attendance_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
