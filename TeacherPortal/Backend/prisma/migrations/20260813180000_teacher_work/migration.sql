-- CreateEnum
CREATE TYPE "TeacherPermissionStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceCorrectionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "teacher_permission_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "permission_type" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "attachment_name" TEXT,
    "status" "TeacherPermissionStatus" NOT NULL DEFAULT 'PENDING',
    "timeline" JSONB NOT NULL DEFAULT '[]',
    "reject_reason" TEXT,
    "academic_year" TEXT,
    "term" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_permission_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_attendance_corrections" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "attendance_date" DATE NOT NULL,
    "correction_type" TEXT NOT NULL,
    "expected_time" TEXT,
    "reason" TEXT NOT NULL,
    "status" "AttendanceCorrectionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_attendance_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_calendar_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "location" TEXT,
    "description" TEXT,
    "organizer" TEXT,
    "participants" TEXT,
    "academic_year" TEXT,
    "term" TEXT,
    "all_day" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teacher_permission_requests_organization_id_user_id_idx" ON "teacher_permission_requests"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "teacher_permission_requests_organization_id_status_idx" ON "teacher_permission_requests"("organization_id", "status");

-- CreateIndex
CREATE INDEX "teacher_attendance_corrections_organization_id_user_id_idx" ON "teacher_attendance_corrections"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "school_calendar_events_organization_id_start_date_idx" ON "school_calendar_events"("organization_id", "start_date");
