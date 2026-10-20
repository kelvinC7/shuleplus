-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "KitStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('AT_SCHOOL', 'AT_HOME');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'MOBILE_MONEY', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ParentRelation" AS ENUM ('FATHER', 'MOTHER', 'GUARDIAN');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "organization_code" TEXT,
    "organization_name" TEXT NOT NULL,
    "district" TEXT,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kits" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grade_level" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" "KitStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kit_requirements" (
    "id" TEXT NOT NULL,
    "kit_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kit_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kit_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "request_number" TEXT NOT NULL,
    "kit_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "student_code" TEXT,
    "class_name" TEXT,
    "grade_level" TEXT,
    "parent_name" TEXT NOT NULL,
    "parent_phone" TEXT,
    "parent_relation" "ParentRelation" NOT NULL,
    "delivery_method" "DeliveryMethod" NOT NULL,
    "subtotal" DECIMAL(65,30) NOT NULL,
    "home_fee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "recorded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kit_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kit_request_payments" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "payment_number" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'MOBILE_MONEY',
    "status" "PaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "reference" TEXT,
    "paid_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kit_request_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_organization_id_key" ON "tenants"("organization_id");

-- CreateIndex
CREATE INDEX "kits_organization_id_idx" ON "kits"("organization_id");

-- CreateIndex
CREATE INDEX "kits_organization_id_status_idx" ON "kits"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "kits_organization_id_grade_level_key" ON "kits"("organization_id", "grade_level");

-- CreateIndex
CREATE INDEX "kit_requirements_kit_id_idx" ON "kit_requirements"("kit_id");

-- CreateIndex
CREATE UNIQUE INDEX "kit_requests_request_number_key" ON "kit_requests"("request_number");

-- CreateIndex
CREATE INDEX "kit_requests_organization_id_idx" ON "kit_requests"("organization_id");

-- CreateIndex
CREATE INDEX "kit_requests_organization_id_status_idx" ON "kit_requests"("organization_id", "status");

-- CreateIndex
CREATE INDEX "kit_requests_organization_id_student_id_idx" ON "kit_requests"("organization_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "kit_request_payments_payment_number_key" ON "kit_request_payments"("payment_number");

-- CreateIndex
CREATE INDEX "kit_request_payments_request_id_idx" ON "kit_request_payments"("request_id");

-- CreateIndex
CREATE INDEX "kit_request_payments_organization_id_idx" ON "kit_request_payments"("organization_id");

-- AddForeignKey
ALTER TABLE "kits" ADD CONSTRAINT "kits_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kit_requirements" ADD CONSTRAINT "kit_requirements_kit_id_fkey" FOREIGN KEY ("kit_id") REFERENCES "kits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kit_requests" ADD CONSTRAINT "kit_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kit_requests" ADD CONSTRAINT "kit_requests_kit_id_fkey" FOREIGN KEY ("kit_id") REFERENCES "kits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kit_request_payments" ADD CONSTRAINT "kit_request_payments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "kit_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
