-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('TEXTBOOK', 'REFERENCE', 'NOVEL', 'STORY_BOOK', 'DICTIONARY', 'ENCYCLOPEDIA', 'TEACHER_GUIDE', 'REVISION_MATERIAL', 'PAST_PAPER', 'MAGAZINE', 'NEWSPAPER', 'EBOOK', 'AUDIO_BOOK', 'EDUCATIONAL_VIDEO', 'RESEARCH_MATERIAL');

-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('AVAILABLE', 'BORROWED', 'OVERDUE', 'DAMAGED', 'UNDER_REPAIR', 'LOST', 'MISSING', 'RESERVED', 'ARCHIVED', 'DISPOSED');

-- CreateEnum
CREATE TYPE "BorrowerType" AS ENUM ('STUDENT', 'TEACHER');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'RETURNED', 'OVERDUE', 'LOST');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'FULFILLED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "FineStatus" AS ENUM ('PENDING', 'PAID', 'WAIVED');

-- CreateEnum
CREATE TYPE "FineReason" AS ENUM ('OVERDUE', 'DAMAGED', 'LOST');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PURCHASED');

-- CreateEnum
CREATE TYPE "RequestPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'APPROVED', 'IN_TRANSIT', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DigitalFileType" AS ENUM ('PDF', 'EBOOK', 'AUDIO', 'VIDEO', 'DOCUMENT', 'SPREADSHEET');

-- CreateEnum
CREATE TYPE "LostBookPolicy" AS ENUM ('REPLACEMENT_COST', 'FIXED_FINE', 'WARNING_ONLY');

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

-- CreateTable
CREATE TABLE "resource_categories" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ResourceType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_subjects" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shelf_locations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "building" TEXT NOT NULL DEFAULT 'Main',
    "room" TEXT,
    "section" TEXT NOT NULL,
    "shelf" TEXT NOT NULL,
    "row" TEXT,
    "position" TEXT,
    "capacity" INTEGER DEFAULT 50,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shelf_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_resources" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isbn" TEXT,
    "book_code" TEXT,
    "author" TEXT,
    "publisher" TEXT,
    "edition" TEXT,
    "publication_year" INTEGER,
    "subject_id" TEXT,
    "category_id" TEXT,
    "language" TEXT DEFAULT 'English',
    "class_level" TEXT,
    "academic_year" TEXT,
    "description" TEXT,
    "cover_url" TEXT,
    "total_copies" INTEGER NOT NULL DEFAULT 1,
    "available_copies" INTEGER NOT NULL DEFAULT 1,
    "shelf_location_id" TEXT,
    "status" "ResourceStatus" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_copies" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "qr_code" TEXT,
    "library_id" TEXT NOT NULL,
    "status" "ResourceStatus" NOT NULL DEFAULT 'AVAILABLE',
    "condition" TEXT DEFAULT 'Good',
    "purchase_price" DECIMAL(10,2),
    "source" TEXT DEFAULT 'Purchase',
    "acquired_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_copies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "copy_id" TEXT NOT NULL,
    "borrower_type" "BorrowerType" NOT NULL,
    "borrower_id" TEXT NOT NULL,
    "borrower_name" TEXT NOT NULL,
    "borrower_class" TEXT,
    "loan_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3) NOT NULL,
    "return_date" TIMESTAMP(3),
    "renewed_count" INTEGER NOT NULL DEFAULT 0,
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "issued_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "copy_id" TEXT,
    "borrower_type" "BorrowerType" NOT NULL,
    "borrower_id" TEXT NOT NULL,
    "borrower_name" TEXT NOT NULL,
    "borrower_class" TEXT,
    "reservation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiry_date" TIMESTAMP(3),
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "position" INTEGER,
    "fulfilled_loan_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fines" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "loan_id" TEXT NOT NULL,
    "borrower_type" "BorrowerType" NOT NULL,
    "borrower_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" "FineReason" NOT NULL,
    "status" "FineStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_visits" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "borrower_type" "BorrowerType" NOT NULL,
    "borrower_id" TEXT NOT NULL,
    "borrower_name" TEXT NOT NULL,
    "borrower_class" TEXT,
    "check_in" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "check_out" TIMESTAMP(3),
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "library_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_resources" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "file_type" "DigitalFileType" NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER,
    "uploaded_by" TEXT,
    "access_roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subject_id" TEXT,
    "class_level" TEXT,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "digital_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "requester_type" "BorrowerType" NOT NULL,
    "requester_id" TEXT NOT NULL,
    "requester_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "reason" TEXT,
    "priority" "RequestPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_transfers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "copy_id" TEXT NOT NULL,
    "from_org_id" TEXT NOT NULL,
    "to_org_id" TEXT NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "requested_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_settings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "loan_period_days" INTEGER NOT NULL DEFAULT 7,
    "max_books_student" INTEGER NOT NULL DEFAULT 3,
    "max_books_teacher" INTEGER NOT NULL DEFAULT 5,
    "renewals_allowed" BOOLEAN NOT NULL DEFAULT true,
    "max_renewals" INTEGER NOT NULL DEFAULT 1,
    "fines_enabled" BOOLEAN NOT NULL DEFAULT false,
    "fine_per_day" DECIMAL(10,2),
    "max_fine" DECIMAL(10,2),
    "lost_book_policy" "LostBookPolicy" NOT NULL DEFAULT 'REPLACEMENT_COST',
    "qr_enabled" BOOLEAN NOT NULL DEFAULT true,
    "barcode_enabled" BOOLEAN NOT NULL DEFAULT true,
    "due_reminder_days" INTEGER NOT NULL DEFAULT 2,
    "overdue_reminder_days" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_organization_id_key" ON "tenants"("organization_id");

-- CreateIndex
CREATE INDEX "resource_categories_organization_id_idx" ON "resource_categories"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "resource_categories_organization_id_name_key" ON "resource_categories"("organization_id", "name");

-- CreateIndex
CREATE INDEX "library_subjects_organization_id_idx" ON "library_subjects"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "library_subjects_organization_id_name_key" ON "library_subjects"("organization_id", "name");

-- CreateIndex
CREATE INDEX "shelf_locations_organization_id_idx" ON "shelf_locations"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "shelf_locations_organization_id_building_section_shelf_key" ON "shelf_locations"("organization_id", "building", "section", "shelf");

-- CreateIndex
CREATE INDEX "book_resources_organization_id_idx" ON "book_resources"("organization_id");

-- CreateIndex
CREATE INDEX "book_resources_organization_id_title_idx" ON "book_resources"("organization_id", "title");

-- CreateIndex
CREATE INDEX "book_resources_organization_id_isbn_idx" ON "book_resources"("organization_id", "isbn");

-- CreateIndex
CREATE INDEX "book_resources_organization_id_status_idx" ON "book_resources"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "book_copies_barcode_key" ON "book_copies"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "book_copies_library_id_key" ON "book_copies"("library_id");

-- CreateIndex
CREATE INDEX "book_copies_organization_id_idx" ON "book_copies"("organization_id");

-- CreateIndex
CREATE INDEX "book_copies_organization_id_status_idx" ON "book_copies"("organization_id", "status");

-- CreateIndex
CREATE INDEX "book_copies_resource_id_idx" ON "book_copies"("resource_id");

-- CreateIndex
CREATE INDEX "loans_organization_id_idx" ON "loans"("organization_id");

-- CreateIndex
CREATE INDEX "loans_organization_id_status_idx" ON "loans"("organization_id", "status");

-- CreateIndex
CREATE INDEX "loans_copy_id_idx" ON "loans"("copy_id");

-- CreateIndex
CREATE INDEX "loans_borrower_id_idx" ON "loans"("borrower_id");

-- CreateIndex
CREATE INDEX "reservations_organization_id_idx" ON "reservations"("organization_id");

-- CreateIndex
CREATE INDEX "reservations_organization_id_status_idx" ON "reservations"("organization_id", "status");

-- CreateIndex
CREATE INDEX "reservations_resource_id_idx" ON "reservations"("resource_id");

-- CreateIndex
CREATE INDEX "reservations_borrower_id_idx" ON "reservations"("borrower_id");

-- CreateIndex
CREATE INDEX "fines_organization_id_idx" ON "fines"("organization_id");

-- CreateIndex
CREATE INDEX "fines_organization_id_status_idx" ON "fines"("organization_id", "status");

-- CreateIndex
CREATE INDEX "fines_loan_id_idx" ON "fines"("loan_id");

-- CreateIndex
CREATE INDEX "library_visits_organization_id_idx" ON "library_visits"("organization_id");

-- CreateIndex
CREATE INDEX "library_visits_organization_id_check_in_idx" ON "library_visits"("organization_id", "check_in");

-- CreateIndex
CREATE INDEX "library_visits_borrower_id_idx" ON "library_visits"("borrower_id");

-- CreateIndex
CREATE INDEX "digital_resources_organization_id_idx" ON "digital_resources"("organization_id");

-- CreateIndex
CREATE INDEX "digital_resources_organization_id_file_type_idx" ON "digital_resources"("organization_id", "file_type");

-- CreateIndex
CREATE INDEX "book_requests_organization_id_idx" ON "book_requests"("organization_id");

-- CreateIndex
CREATE INDEX "book_requests_organization_id_status_idx" ON "book_requests"("organization_id", "status");

-- CreateIndex
CREATE INDEX "book_transfers_organization_id_idx" ON "book_transfers"("organization_id");

-- CreateIndex
CREATE INDEX "book_transfers_to_org_id_idx" ON "book_transfers"("to_org_id");

-- CreateIndex
CREATE UNIQUE INDEX "library_settings_organization_id_key" ON "library_settings"("organization_id");

-- AddForeignKey
ALTER TABLE "resource_categories" ADD CONSTRAINT "resource_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_subjects" ADD CONSTRAINT "library_subjects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shelf_locations" ADD CONSTRAINT "shelf_locations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_resources" ADD CONSTRAINT "book_resources_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_resources" ADD CONSTRAINT "book_resources_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "resource_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_resources" ADD CONSTRAINT "book_resources_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "library_subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_resources" ADD CONSTRAINT "book_resources_shelf_location_id_fkey" FOREIGN KEY ("shelf_location_id") REFERENCES "shelf_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_copies" ADD CONSTRAINT "book_copies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_copies" ADD CONSTRAINT "book_copies_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "book_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_copy_id_fkey" FOREIGN KEY ("copy_id") REFERENCES "book_copies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "book_resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_copy_id_fkey" FOREIGN KEY ("copy_id") REFERENCES "book_copies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_fulfilled_loan_id_fkey" FOREIGN KEY ("fulfilled_loan_id") REFERENCES "loans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_visits" ADD CONSTRAINT "library_visits_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_resources" ADD CONSTRAINT "digital_resources_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_requests" ADD CONSTRAINT "book_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_transfers" ADD CONSTRAINT "book_transfers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_transfers" ADD CONSTRAINT "book_transfers_to_org_id_fkey" FOREIGN KEY ("to_org_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_settings" ADD CONSTRAINT "library_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
