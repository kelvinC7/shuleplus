-- CreateEnum
CREATE TYPE "AdmissionApplicationStatus" AS ENUM (
  'SUBMITTED',
  'UNDER_REVIEW',
  'DOCUMENTS_VERIFICATION',
  'ASSESSMENT_INTERVIEW',
  'ADMISSION_APPROVED',
  'FEE_PAYMENT',
  'ENROLLED',
  'REJECTED'
);

-- CreateTable
CREATE TABLE "school_admission_settings" (
    "organization_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "application_deadline" TIMESTAMP(3),
    "estimated_fee" INTEGER,
    "available_places" JSONB NOT NULL DEFAULT '{}',
    "required_documents" JSONB NOT NULL DEFAULT '[]',
    "terms_url" TEXT,
    "privacy_url" TEXT,
    "welcome_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_admission_settings_pkey" PRIMARY KEY ("organization_id")
);

-- CreateTable
CREATE TABLE "admission_applications" (
    "id" TEXT NOT NULL,
    "application_number" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "status" "AdmissionApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "draft_token" TEXT,
    "admission_level" TEXT NOT NULL,
    "class_applying" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "term_of_entry" TEXT NOT NULL,
    "boarding_preference" TEXT NOT NULL,
    "student_gender" TEXT NOT NULL,
    "previous_school" TEXT,
    "preferred_combination" TEXT,
    "admission_type" TEXT NOT NULL,
    "student_details" JSONB NOT NULL,
    "parent_details" JSONB NOT NULL,
    "documents" JSONB NOT NULL DEFAULT '[]',
    "confirm_accurate" BOOLEAN NOT NULL DEFAULT false,
    "accept_terms" BOOLEAN NOT NULL DEFAULT false,
    "school_notes" TEXT,
    "interview_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admission_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admission_applications_application_number_key" ON "admission_applications"("application_number");

-- CreateIndex
CREATE UNIQUE INDEX "admission_applications_draft_token_key" ON "admission_applications"("draft_token");

-- CreateIndex
CREATE INDEX "admission_applications_organization_id_status_idx" ON "admission_applications"("organization_id", "status");

-- CreateIndex
CREATE INDEX "admission_applications_organization_id_submitted_at_idx" ON "admission_applications"("organization_id", "submitted_at");

-- AddForeignKey
ALTER TABLE "school_admission_settings" ADD CONSTRAINT "school_admission_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_applications" ADD CONSTRAINT "admission_applications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
