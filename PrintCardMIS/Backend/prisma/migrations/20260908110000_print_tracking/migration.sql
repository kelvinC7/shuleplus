-- Print Card module — full schema (tenants + print tracking)

CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "PersonKind" AS ENUM ('STUDENT', 'STAFF');
CREATE TYPE "CardStatus" AS ENUM ('NOT_PRINTED', 'PRINTING', 'PRINTED', 'PARTIALLY_PRINTED', 'REPRINT_REQUIRED', 'REPRINTED');
CREATE TYPE "PrintBatchStatus" AS ENUM ('DRAFT', 'READY', 'PRINTING', 'COMPLETED', 'PARTIAL', 'CANCELLED');
CREATE TYPE "PrintItemResult" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'SKIPPED');
CREATE TYPE "PrintType" AS ENUM ('ORIGINAL', 'REPRINT');

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

CREATE UNIQUE INDEX "tenants_organization_id_key" ON "tenants"("organization_id");

CREATE TABLE "card_records" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "person_kind" "PersonKind" NOT NULL,
    "person_id" TEXT NOT NULL,
    "person_code" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "photo_url" TEXT,
    "class_name" TEXT,
    "education_level" TEXT,
    "role" TEXT,
    "department" TEXT,
    "gender" TEXT,
    "academic_year" TEXT,
    "status" "CardStatus" NOT NULL DEFAULT 'NOT_PRINTED',
    "print_count" INTEGER NOT NULL DEFAULT 0,
    "last_printed_at" TIMESTAMP(3),
    "last_printed_by" TEXT,
    "last_batch_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "card_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "card_records_organization_id_person_kind_person_id_key" ON "card_records"("organization_id", "person_kind", "person_id");
CREATE INDEX "card_records_organization_id_status_idx" ON "card_records"("organization_id", "status");
CREATE INDEX "card_records_organization_id_person_kind_idx" ON "card_records"("organization_id", "person_kind");

CREATE TABLE "print_batches" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "batch_number" TEXT NOT NULL,
    "person_kind" "PersonKind" NOT NULL,
    "status" "PrintBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "total_cards" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "created_by_email" TEXT,
    "printer_name" TEXT,
    "notes" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "print_batches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "print_batches_batch_number_key" ON "print_batches"("batch_number");
CREATE INDEX "print_batches_organization_id_status_idx" ON "print_batches"("organization_id", "status");
CREATE INDEX "print_batches_organization_id_created_at_idx" ON "print_batches"("organization_id", "created_at");

CREATE TABLE "print_batch_items" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "card_record_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "print_type" "PrintType" NOT NULL DEFAULT 'ORIGINAL',
    "result" "PrintItemResult" NOT NULL DEFAULT 'PENDING',
    "failure_reason" TEXT,
    "confirmed_at" TIMESTAMP(3),
    CONSTRAINT "print_batch_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "print_batch_items_batch_id_idx" ON "print_batch_items"("batch_id");

CREATE TABLE "print_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "card_record_id" TEXT NOT NULL,
    "batch_id" TEXT,
    "batch_number" TEXT,
    "event_type" TEXT NOT NULL,
    "print_type" "PrintType" NOT NULL DEFAULT 'ORIGINAL',
    "result" TEXT NOT NULL DEFAULT 'SUCCESS',
    "performed_by" TEXT NOT NULL,
    "performed_by_email" TEXT,
    "printer_name" TEXT,
    "failure_reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "print_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "print_events_organization_id_created_at_idx" ON "print_events"("organization_id", "created_at");
CREATE INDEX "print_events_card_record_id_idx" ON "print_events"("card_record_id");

ALTER TABLE "print_batch_items" ADD CONSTRAINT "print_batch_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "print_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "print_batch_items" ADD CONSTRAINT "print_batch_items_card_record_id_fkey" FOREIGN KEY ("card_record_id") REFERENCES "card_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "print_events" ADD CONSTRAINT "print_events_card_record_id_fkey" FOREIGN KEY ("card_record_id") REFERENCES "card_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
