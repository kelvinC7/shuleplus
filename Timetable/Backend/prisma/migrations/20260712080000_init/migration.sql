-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "TimePreference" AS ENUM ('ANY', 'MORNING', 'AFTERNOON', 'CUSTOM');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "organization_code" TEXT,
    "organization_name" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "teacher_assignments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "teacher_user_id" TEXT NOT NULL,
    "teacher_name" TEXT NOT NULL,
    "class_name" TEXT NOT NULL,
    "subject_name" TEXT NOT NULL,
    "periods_per_week" INTEGER NOT NULL DEFAULT 1,
    "room" TEXT,
    "term" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "superseded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "teacher_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "timetable_school_schedule" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "day_start" TEXT NOT NULL DEFAULT '07:30',
    "day_end" TEXT NOT NULL DEFAULT '16:30',
    "period_duration_minutes" INTEGER NOT NULL DEFAULT 40,
    "active_days" JSONB NOT NULL DEFAULT '["Monday","Tuesday","Wednesday","Thursday","Friday"]',
    "breaks" JSONB NOT NULL DEFAULT '[]',
    "term" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "timetable_school_schedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "timetable_teacher_profiles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "teacher_user_id" TEXT NOT NULL,
    "teacher_name" TEXT NOT NULL,
    "max_periods_per_day" INTEGER NOT NULL DEFAULT 6,
    "available_days" JSONB NOT NULL DEFAULT '["Monday","Tuesday","Wednesday","Thursday","Friday"]',
    "preferred_slots" JSONB NOT NULL DEFAULT '[]',
    "unavailable_slots" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "timetable_teacher_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "timetable_course_config" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "subject_name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "requires_lab" BOOLEAN NOT NULL DEFAULT false,
    "prefers_double_period" BOOLEAN NOT NULL DEFAULT false,
    "time_preference" "TimePreference" NOT NULL DEFAULT 'ANY',
    "custom_window_start" TEXT,
    "custom_window_end" TEXT,
    "scheduling_rules" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "timetable_course_config_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "timetable_extra_activities" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "class_name" TEXT,
    "day_of_week" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "term" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "synced" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "timetable_extra_activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "academic_timetables" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "class_name" TEXT NOT NULL,
    "subject_name" TEXT NOT NULL,
    "teacher_user_id" TEXT NOT NULL,
    "teacher_name" TEXT NOT NULL,
    "day_of_week" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "room" TEXT,
    "term" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "extra_activity_id" TEXT,
    "is_extra_activity" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "academic_timetables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_organization_id_key" ON "tenants"("organization_id");
CREATE INDEX "teacher_assignments_organization_id_term_academic_year_idx" ON "teacher_assignments"("organization_id", "term", "academic_year");
CREATE INDEX "teacher_assignments_organization_id_class_name_idx" ON "teacher_assignments"("organization_id", "class_name");
CREATE UNIQUE INDEX "timetable_school_schedule_organization_id_term_academic_year_key" ON "timetable_school_schedule"("organization_id", "term", "academic_year");
CREATE UNIQUE INDEX "timetable_teacher_profiles_organization_id_teacher_user_id_key" ON "timetable_teacher_profiles"("organization_id", "teacher_user_id");
CREATE UNIQUE INDEX "timetable_course_config_organization_id_subject_name_key" ON "timetable_course_config"("organization_id", "subject_name");
CREATE INDEX "timetable_extra_activities_organization_id_term_academic_year_idx" ON "timetable_extra_activities"("organization_id", "term", "academic_year");
CREATE INDEX "academic_timetables_organization_id_term_academic_year_idx" ON "academic_timetables"("organization_id", "term", "academic_year");
CREATE INDEX "academic_timetables_organization_id_class_name_idx" ON "academic_timetables"("organization_id", "class_name");
CREATE INDEX "academic_timetables_organization_id_teacher_user_id_idx" ON "academic_timetables"("organization_id", "teacher_user_id");

-- AddForeignKey
ALTER TABLE "academic_timetables" ADD CONSTRAINT "academic_timetables_extra_activity_id_fkey" FOREIGN KEY ("extra_activity_id") REFERENCES "timetable_extra_activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
