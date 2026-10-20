-- CreateEnum
CREATE TYPE "PhotoImportJobStatus" AS ENUM ('QUEUED', 'ANALYZING', 'READY', 'IMPORTING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "PhotoImportRowStatus" AS ENUM ('MATCHED', 'MISSING', 'UNKNOWN', 'DUPLICATE', 'INVALID', 'SKIPPED', 'IMPORTED', 'FAILED');

-- CreateEnum
CREATE TYPE "ExistingPhotoPolicy" AS ENUM ('ONLY_MISSING', 'REPLACE');

-- CreateTable
CREATE TABLE "photo_import_jobs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "status" "PhotoImportJobStatus" NOT NULL DEFAULT 'QUEUED',
    "excel_path" TEXT,
    "zip_path" TEXT,
    "work_dir" TEXT,
    "photo_id_regex" TEXT NOT NULL DEFAULT '^[A-Za-z0-9_-]+$',
    "existing_photo_policy" "ExistingPhotoPolicy" NOT NULL DEFAULT 'ONLY_MISSING',
    "stats" JSONB,
    "error_message" TEXT,
    "created_by" TEXT NOT NULL,
    "created_by_email" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photo_import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_import_rows" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "photo_id" TEXT,
    "student_id" TEXT,
    "student_code" TEXT,
    "student_name" TEXT,
    "status" "PhotoImportRowStatus" NOT NULL,
    "file_name" TEXT,
    "file_path" TEXT,
    "file_hash" TEXT,
    "message" TEXT,
    "has_existing_photo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photo_import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "photo_import_jobs_organization_id_created_at_idx" ON "photo_import_jobs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "photo_import_jobs_status_created_at_idx" ON "photo_import_jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "photo_import_rows_job_id_status_idx" ON "photo_import_rows"("job_id", "status");

-- CreateIndex
CREATE INDEX "photo_import_rows_job_id_photo_id_idx" ON "photo_import_rows"("job_id", "photo_id");

-- AddForeignKey
ALTER TABLE "photo_import_rows" ADD CONSTRAINT "photo_import_rows_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "photo_import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
