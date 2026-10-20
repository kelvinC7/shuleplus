-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "FeeStructureStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FeeItemType" AS ENUM ('MANDATORY', 'OPTIONAL');

-- CreateEnum
CREATE TYPE "StudentCategory" AS ENUM ('DAY', 'BOARDING', 'PUBLIC', 'PRIVATE', 'TRANSFER', 'NEW', 'CONTINUING', 'SCHOLARSHIP');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'RESTORED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'ONLINE', 'POS', 'QR', 'USSD', 'CHEQUE', 'SCHOOL_WALLET');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED', 'REFUNDED', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'OVERDUE', 'CANCELLED', 'PENDING_APPROVAL');

-- CreateEnum
CREATE TYPE "ScholarshipType" AS ENUM ('GOVERNMENT', 'NGO', 'PRIVATE', 'MERIT', 'NEED_BASED', 'FINANCIAL_AID');

-- CreateEnum
CREATE TYPE "HoldType" AS ENUM ('FINANCIAL', 'EXAMINATION', 'REGISTRATION');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'EMAIL', 'PUSH', 'PARENT_PORTAL', 'STUDENT_PORTAL', 'WHATSAPP');

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
CREATE TABLE "fee_categories" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_structures" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "school_category" TEXT,
    "school_level" TEXT,
    "class_name" TEXT,
    "student_status" TEXT,
    "boarding_type" TEXT,
    "student_type" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "FeeStructureStatus" NOT NULL DEFAULT 'DRAFT',
    "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "early_discount_pct" DECIMAL(5,2),
    "sibling_discount_pct" DECIMAL(5,2),
    "penalty_rate_pct" DECIMAL(5,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_structure_items" (
    "id" TEXT NOT NULL,
    "structure_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "item_type" "FeeItemType" NOT NULL DEFAULT 'MANDATORY',
    "is_additional" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_structure_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_bills" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "bill_number" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "student_code" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "class_name" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "student_category" "StudentCategory" NOT NULL DEFAULT 'DAY',
    "structure_id" TEXT,
    "status" "BillStatus" NOT NULL DEFAULT 'PENDING',
    "gross_amount" DECIMAL(14,2) NOT NULL,
    "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "scholarship_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "penalty_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(14,2) NOT NULL,
    "paid_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "due_date" TIMESTAMP(3),
    "billed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_line_items" (
    "id" TEXT NOT NULL,
    "bill_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "bill_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "payment_number" TEXT NOT NULL,
    "bill_id" TEXT,
    "student_id" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "class_name" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "payer_name" TEXT,
    "is_partial" BOOLEAN NOT NULL DEFAULT false,
    "is_advance" BOOLEAN NOT NULL DEFAULT false,
    "is_bulk" BOOLEAN NOT NULL DEFAULT false,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_at" TIMESTAMP(3),
    "reversed_at" TIMESTAMP(3),
    "refund_amount" DECIMAL(14,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "receipt_number" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "student_code" TEXT,
    "class_name" TEXT,
    "amount_paid" DECIMAL(14,2) NOT NULL,
    "outstanding" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "method" TEXT NOT NULL,
    "qr_code" TEXT,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installment_plans" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "class_name" TEXT,
    "bill_id" TEXT,
    "plan_name" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "total_amount" DECIMAL(14,2) NOT NULL,
    "paid_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "remaining" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installments" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "bill_id" TEXT,
    "sequence" INTEGER NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paid_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "penalty" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsors" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "total_fund" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "allocated_fund" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "remaining_fund" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scholarships" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "sponsor_id" TEXT,
    "student_id" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "class_name" TEXT,
    "type" "ScholarshipType" NOT NULL,
    "academic_year" TEXT NOT NULL,
    "term" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "allocated" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "remaining" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scholarships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_holds" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "bill_id" TEXT,
    "student_id" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "hold_type" "HoldType" NOT NULL,
    "reason" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "placed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMP(3),

    CONSTRAINT "financial_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_notifications" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
    "recipient" TEXT,
    "related_type" TEXT,
    "related_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "decided_by" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "actor_email" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_organization_id_key" ON "tenants"("organization_id");

-- CreateIndex
CREATE INDEX "fee_categories_organization_id_idx" ON "fee_categories"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "fee_categories_organization_id_code_key" ON "fee_categories"("organization_id", "code");

-- CreateIndex
CREATE INDEX "fee_structures_organization_id_academic_year_term_idx" ON "fee_structures"("organization_id", "academic_year", "term");

-- CreateIndex
CREATE UNIQUE INDEX "fee_structures_organization_id_code_version_key" ON "fee_structures"("organization_id", "code", "version");

-- CreateIndex
CREATE INDEX "fee_structure_items_structure_id_idx" ON "fee_structure_items"("structure_id");

-- CreateIndex
CREATE INDEX "student_bills_organization_id_student_id_idx" ON "student_bills"("organization_id", "student_id");

-- CreateIndex
CREATE INDEX "student_bills_organization_id_status_idx" ON "student_bills"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "student_bills_organization_id_bill_number_key" ON "student_bills"("organization_id", "bill_number");

-- CreateIndex
CREATE INDEX "bill_line_items_bill_id_idx" ON "bill_line_items"("bill_id");

-- CreateIndex
CREATE INDEX "payments_organization_id_status_idx" ON "payments"("organization_id", "status");

-- CreateIndex
CREATE INDEX "payments_organization_id_paid_at_idx" ON "payments"("organization_id", "paid_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_organization_id_payment_number_key" ON "payments"("organization_id", "payment_number");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_payment_id_key" ON "receipts"("payment_id");

-- CreateIndex
CREATE INDEX "receipts_organization_id_idx" ON "receipts"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_organization_id_receipt_number_key" ON "receipts"("organization_id", "receipt_number");

-- CreateIndex
CREATE INDEX "installment_plans_organization_id_status_idx" ON "installment_plans"("organization_id", "status");

-- CreateIndex
CREATE INDEX "installments_plan_id_idx" ON "installments"("plan_id");

-- CreateIndex
CREATE INDEX "sponsors_organization_id_idx" ON "sponsors"("organization_id");

-- CreateIndex
CREATE INDEX "scholarships_organization_id_student_id_idx" ON "scholarships"("organization_id", "student_id");

-- CreateIndex
CREATE INDEX "financial_holds_organization_id_is_active_idx" ON "financial_holds"("organization_id", "is_active");

-- CreateIndex
CREATE INDEX "fee_notifications_organization_id_sent_at_idx" ON "fee_notifications"("organization_id", "sent_at");

-- CreateIndex
CREATE INDEX "approval_requests_organization_id_status_idx" ON "approval_requests"("organization_id", "status");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_created_at_idx" ON "audit_logs"("organization_id", "created_at");

-- AddForeignKey
ALTER TABLE "fee_structure_items" ADD CONSTRAINT "fee_structure_items_structure_id_fkey" FOREIGN KEY ("structure_id") REFERENCES "fee_structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structure_items" ADD CONSTRAINT "fee_structure_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "fee_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_bills" ADD CONSTRAINT "student_bills_structure_id_fkey" FOREIGN KEY ("structure_id") REFERENCES "fee_structures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_line_items" ADD CONSTRAINT "bill_line_items_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "student_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "student_bills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installments" ADD CONSTRAINT "installments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "installment_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installments" ADD CONSTRAINT "installments_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "student_bills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarships" ADD CONSTRAINT "scholarships_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "sponsors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_holds" ADD CONSTRAINT "financial_holds_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "student_bills"("id") ON DELETE SET NULL ON UPDATE CASCADE;
