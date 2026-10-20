/*
  Warnings:

  - You are about to drop the `activity_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `records` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `reports` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users_cache` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'PROMOTED', 'GRADUATED', 'TRANSFERRED', 'WITHDRAWN');

-- DropForeignKey
ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "records" DROP CONSTRAINT "records_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "settings" DROP CONSTRAINT "settings_organization_id_fkey";

-- DropTable
DROP TABLE "activity_logs";

-- DropTable
DROP TABLE "records";

-- DropTable
DROP TABLE "reports";

-- DropTable
DROP TABLE "settings";

-- DropTable
DROP TABLE "users_cache";

-- CreateTable
CREATE TABLE "combinations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT,
    "subjects" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "combinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stream" TEXT,
    "category" TEXT,
    "combination_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "student_uid" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "gender" "Gender",
    "date_of_birth" TIMESTAMP(3),
    "nationality" TEXT,
    "province" TEXT,
    "district" TEXT,
    "sector" TEXT,
    "cell" TEXT,
    "village" TEXT,
    "father_name" TEXT,
    "father_phone" TEXT,
    "father_email" TEXT,
    "father_national_id" TEXT,
    "mother_name" TEXT,
    "mother_phone" TEXT,
    "mother_email" TEXT,
    "mother_national_id" TEXT,
    "student_code" TEXT,
    "sdm_code" TEXT,
    "student_photo" TEXT,
    "rfid_uid" TEXT,
    "fingerprint_id" TEXT,
    "identity_remarks" TEXT,
    "discipline_marks" DECIMAL(65,30),
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "promoted_to_class_id" TEXT,
    "promoted_to_year" TEXT,
    "recorded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "combinations_organization_id_idx" ON "combinations"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "combinations_organization_id_name_key" ON "combinations"("organization_id", "name");

-- CreateIndex
CREATE INDEX "classes_organization_id_idx" ON "classes"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "classes_organization_id_name_combination_id_stream_key" ON "classes"("organization_id", "name", "combination_id", "stream");

-- CreateIndex
CREATE INDEX "students_organization_id_idx" ON "students"("organization_id");

-- CreateIndex
CREATE INDEX "students_organization_id_rfid_uid_idx" ON "students"("organization_id", "rfid_uid");

-- CreateIndex
CREATE INDEX "students_organization_id_fingerprint_id_idx" ON "students"("organization_id", "fingerprint_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_organization_id_student_uid_key" ON "students"("organization_id", "student_uid");

-- CreateIndex
CREATE INDEX "enrollments_organization_id_idx" ON "enrollments"("organization_id");

-- CreateIndex
CREATE INDEX "enrollments_organization_id_class_id_academic_year_idx" ON "enrollments"("organization_id", "class_id", "academic_year");

-- CreateIndex
CREATE INDEX "enrollments_organization_id_is_current_idx" ON "enrollments"("organization_id", "is_current");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_organization_id_student_id_academic_year_key" ON "enrollments"("organization_id", "student_id", "academic_year");

-- AddForeignKey
ALTER TABLE "combinations" ADD CONSTRAINT "combinations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_combination_id_fkey" FOREIGN KEY ("combination_id") REFERENCES "combinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_promoted_to_class_id_fkey" FOREIGN KEY ("promoted_to_class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
