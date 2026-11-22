-- CreateEnum
CREATE TYPE "CurriculumProcessingStatus" AS ENUM ('UPLOADED', 'EXTRACTING', 'NEEDS_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED', 'FAILED');

-- CreateEnum
CREATE TYPE "CurriculumReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProcessingJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "LessonPlanStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LessonPlanApprovalAction" AS ENUM ('SUBMITTED', 'APPROVED', 'RETURNED', 'REJECTED');

-- CreateTable
CREATE TABLE "curriculum_books" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "education_level" TEXT,
    "language" TEXT NOT NULL,
    "edition" TEXT,
    "curriculum_version" TEXT,
    "academic_year" TEXT,
    "source_name" TEXT,
    "source_url" TEXT,
    "publication_year" INTEGER,
    "file_key" TEXT NOT NULL,
    "file_size_bytes" INTEGER,
    "page_count" INTEGER,
    "mime_type" TEXT NOT NULL DEFAULT 'application/pdf',
    "version" INTEGER NOT NULL DEFAULT 1,
    "processing_status" "CurriculumProcessingStatus" NOT NULL DEFAULT 'UPLOADED',
    "extraction_summary" JSONB,
    "processing_error" TEXT,
    "published_at" TIMESTAMP(3),
    "published_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curriculum_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_versions" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "change_note" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_processing_jobs" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "status" "ProcessingJobStatus" NOT NULL DEFAULT 'QUEUED',
    "job_type" TEXT NOT NULL DEFAULT 'pdf_extract',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "result" JSONB,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curriculum_processing_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_document_pages" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "page_number" INTEGER NOT NULL,
    "text_content" TEXT,
    "is_scanned" BOOLEAN NOT NULL DEFAULT false,
    "ocr_applied" BOOLEAN NOT NULL DEFAULT false,
    "extraction_confidence" DECIMAL(4,3),
    "layout_json" JSONB,
    "needs_manual_review" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_document_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_units" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "unit_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "key_competence" TEXT,
    "suggested_periods" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "source_page_start" INTEGER,
    "source_page_end" INTEGER,
    "review_status" "CurriculumReviewStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curriculum_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_lessons" (
    "id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "lesson_number" TEXT,
    "title" TEXT NOT NULL,
    "suggested_periods" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "prerequisites" JSONB NOT NULL DEFAULT '[]',
    "materials" JSONB NOT NULL DEFAULT '[]',
    "source_pages" JSONB NOT NULL DEFAULT '[]',
    "source_content" JSONB,
    "extraction_confidence" DECIMAL(4,3),
    "review_status" "CurriculumReviewStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curriculum_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_objectives" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "statement" TEXT NOT NULL,
    "is_official" BOOLEAN NOT NULL DEFAULT true,
    "source_pages" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_source_references" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "page_start" INTEGER,
    "page_end" INTEGER,
    "excerpt" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_source_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_plan_templates" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "schema" JSONB NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_plan_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_lesson_plans" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "school_id" TEXT,
    "teacher_id" TEXT NOT NULL,
    "teacher_name" TEXT,
    "teacher_email" TEXT,
    "curriculum_lesson_id" TEXT,
    "curriculum_version" INTEGER,
    "template_slug" TEXT NOT NULL DEFAULT 'reb-primary-cbc',
    "lesson_date" DATE,
    "term_label" TEXT,
    "duration_minutes" INTEGER NOT NULL,
    "class_size" INTEGER,
    "language" TEXT NOT NULL DEFAULT 'English',
    "plan_content" JSONB NOT NULL,
    "quality_flags" JSONB NOT NULL DEFAULT '[]',
    "status" "LessonPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "current_revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generated_lesson_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_plan_versions" (
    "id" TEXT NOT NULL,
    "lesson_plan_id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "plan_content" JSONB NOT NULL,
    "change_note" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_plan_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_plan_approvals" (
    "id" TEXT NOT NULL,
    "lesson_plan_id" TEXT NOT NULL,
    "action" "LessonPlanApprovalAction" NOT NULL,
    "actor_id" TEXT,
    "actor_name" TEXT,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_plan_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_processing_logs" (
    "id" TEXT NOT NULL,
    "lesson_plan_id" TEXT,
    "book_id" TEXT,
    "operation" TEXT NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_processing_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_activity_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "actor_email" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "curriculum_books_subject_grade_processing_status_idx" ON "curriculum_books"("subject", "grade", "processing_status");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_versions_book_id_version_number_key" ON "curriculum_versions"("book_id", "version_number");

-- CreateIndex
CREATE INDEX "curriculum_processing_jobs_book_id_status_idx" ON "curriculum_processing_jobs"("book_id", "status");

-- CreateIndex
CREATE INDEX "curriculum_document_pages_book_id_idx" ON "curriculum_document_pages"("book_id");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_document_pages_book_id_page_number_key" ON "curriculum_document_pages"("book_id", "page_number");

-- CreateIndex
CREATE INDEX "curriculum_units_book_id_sort_order_idx" ON "curriculum_units"("book_id", "sort_order");

-- CreateIndex
CREATE INDEX "curriculum_lessons_unit_id_sort_order_idx" ON "curriculum_lessons"("unit_id", "sort_order");

-- CreateIndex
CREATE INDEX "learning_objectives_lesson_id_idx" ON "learning_objectives"("lesson_id");

-- CreateIndex
CREATE INDEX "curriculum_source_references_lesson_id_idx" ON "curriculum_source_references"("lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_plan_templates_slug_key" ON "lesson_plan_templates"("slug");

-- CreateIndex
CREATE INDEX "generated_lesson_plans_organization_id_teacher_id_idx" ON "generated_lesson_plans"("organization_id", "teacher_id");

-- CreateIndex
CREATE INDEX "generated_lesson_plans_curriculum_lesson_id_idx" ON "generated_lesson_plans"("curriculum_lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_plan_versions_lesson_plan_id_revision_key" ON "lesson_plan_versions"("lesson_plan_id", "revision");

-- CreateIndex
CREATE INDEX "lesson_plan_approvals_lesson_plan_id_idx" ON "lesson_plan_approvals"("lesson_plan_id");

-- CreateIndex
CREATE INDEX "ai_processing_logs_lesson_plan_id_idx" ON "ai_processing_logs"("lesson_plan_id");

-- CreateIndex
CREATE INDEX "platform_activity_logs_created_at_idx" ON "platform_activity_logs"("created_at");

-- AddForeignKey
ALTER TABLE "curriculum_versions" ADD CONSTRAINT "curriculum_versions_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "curriculum_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_processing_jobs" ADD CONSTRAINT "curriculum_processing_jobs_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "curriculum_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_document_pages" ADD CONSTRAINT "curriculum_document_pages_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "curriculum_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_units" ADD CONSTRAINT "curriculum_units_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "curriculum_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_lessons" ADD CONSTRAINT "curriculum_lessons_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "curriculum_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_objectives" ADD CONSTRAINT "learning_objectives_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "curriculum_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_source_references" ADD CONSTRAINT "curriculum_source_references_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "curriculum_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_lesson_plans" ADD CONSTRAINT "generated_lesson_plans_curriculum_lesson_id_fkey" FOREIGN KEY ("curriculum_lesson_id") REFERENCES "curriculum_lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_plan_versions" ADD CONSTRAINT "lesson_plan_versions_lesson_plan_id_fkey" FOREIGN KEY ("lesson_plan_id") REFERENCES "generated_lesson_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_plan_approvals" ADD CONSTRAINT "lesson_plan_approvals_lesson_plan_id_fkey" FOREIGN KEY ("lesson_plan_id") REFERENCES "generated_lesson_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_processing_logs" ADD CONSTRAINT "ai_processing_logs_lesson_plan_id_fkey" FOREIGN KEY ("lesson_plan_id") REFERENCES "generated_lesson_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
