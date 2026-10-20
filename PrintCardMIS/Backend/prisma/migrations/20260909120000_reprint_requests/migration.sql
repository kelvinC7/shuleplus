-- CreateEnum
CREATE TYPE "ReprintReason" AS ENUM ('LOST', 'DAMAGED', 'STORED', 'INCORRECT_INFORMATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ReprintRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PRINTED', 'COMPLETED');

-- CreateTable
CREATE TABLE "reprint_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "card_record_id" TEXT NOT NULL,
    "person_kind" "PersonKind" NOT NULL,
    "reason" "ReprintReason" NOT NULL,
    "description" TEXT,
    "status" "ReprintRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requested_by" TEXT NOT NULL,
    "requested_by_email" TEXT,
    "reviewed_by" TEXT,
    "reviewed_by_email" TEXT,
    "rejection_reason" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reprint_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reprint_requests_organization_id_status_idx" ON "reprint_requests"("organization_id", "status");

-- CreateIndex
CREATE INDEX "reprint_requests_status_created_at_idx" ON "reprint_requests"("status", "created_at");

-- AddForeignKey
ALTER TABLE "reprint_requests" ADD CONSTRAINT "reprint_requests_card_record_id_fkey" FOREIGN KEY ("card_record_id") REFERENCES "card_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
