-- AlterEnum
ALTER TYPE "ProcessingJobStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "curriculum_books" ADD COLUMN     "description" TEXT,
ADD COLUMN     "document_type" TEXT,
ADD COLUMN     "extraction_options" JSONB,
ADD COLUMN     "file_sha256" TEXT,
ADD COLUMN     "publisher" TEXT,
ADD COLUMN     "storage_provider" TEXT NOT NULL DEFAULT 'local';

-- AlterTable
ALTER TABLE "curriculum_processing_jobs" ADD COLUMN     "cancel_requested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pages_processed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pages_total" INTEGER,
ADD COLUMN     "pipeline_stage" TEXT;
