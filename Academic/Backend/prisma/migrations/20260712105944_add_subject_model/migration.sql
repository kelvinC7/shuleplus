/*
  Warnings:

  - You are about to drop the column `father_email` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `father_name` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `father_national_id` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `father_phone` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `mother_email` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `mother_name` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `mother_national_id` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `mother_phone` on the `students` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ParentRole" AS ENUM ('FATHER', 'MOTHER', 'GUARDIAN');

-- AlterTable
ALTER TABLE "classes" ADD COLUMN     "grade_id" TEXT;

-- AlterTable
ALTER TABLE "students" DROP COLUMN "father_email",
DROP COLUMN "father_name",
DROP COLUMN "father_national_id",
DROP COLUMN "father_phone",
DROP COLUMN "mother_email",
DROP COLUMN "mother_name",
DROP COLUMN "mother_national_id",
DROP COLUMN "mother_phone";

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combination_subjects" (
    "id" TEXT NOT NULL,
    "combination_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "combination_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grades" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parents" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "national_id" TEXT,
    "occupation" TEXT,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_parents" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "role" "ParentRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_parents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subjects_organization_id_idx" ON "subjects"("organization_id");

-- CreateIndex
CREATE INDEX "subjects_organization_id_category_idx" ON "subjects"("organization_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_organization_id_name_key" ON "subjects"("organization_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "combination_subjects_combination_id_subject_id_key" ON "combination_subjects"("combination_id", "subject_id");

-- CreateIndex
CREATE INDEX "grades_organization_id_idx" ON "grades"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "grades_organization_id_name_key" ON "grades"("organization_id", "name");

-- CreateIndex
CREATE INDEX "parents_organization_id_idx" ON "parents"("organization_id");

-- CreateIndex
CREATE INDEX "parents_organization_id_phone_idx" ON "parents"("organization_id", "phone");

-- CreateIndex
CREATE INDEX "parents_organization_id_national_id_idx" ON "parents"("organization_id", "national_id");

-- CreateIndex
CREATE INDEX "student_parents_organization_id_idx" ON "student_parents"("organization_id");

-- CreateIndex
CREATE INDEX "student_parents_organization_id_student_id_idx" ON "student_parents"("organization_id", "student_id");

-- CreateIndex
CREATE INDEX "student_parents_organization_id_parent_id_idx" ON "student_parents"("organization_id", "parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_parents_organization_id_student_id_parent_id_key" ON "student_parents"("organization_id", "student_id", "parent_id");

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combination_subjects" ADD CONSTRAINT "combination_subjects_combination_id_fkey" FOREIGN KEY ("combination_id") REFERENCES "combinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combination_subjects" ADD CONSTRAINT "combination_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parents" ADD CONSTRAINT "parents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_parents" ADD CONSTRAINT "student_parents_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_parents" ADD CONSTRAINT "student_parents_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
