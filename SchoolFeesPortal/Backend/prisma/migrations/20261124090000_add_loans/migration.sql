-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "LoanStatus" AS ENUM ('UNDER_REVIEW', 'APPROVED', 'DISBURSED', 'REJECTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "LoanFrequency" AS ENUM ('MONTHLY', 'BI_WEEKLY', 'WEEKLY', 'QUARTERLY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "LoanDisbursement" AS ENUM ('PAY_SCHOOL_DIRECTLY', 'MOBILE_MONEY', 'BANK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "loan_types" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "min_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "max_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "interest_rate_pct" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "processing_fee" DECIMAL(14,2) NOT NULL DEFAULT 5000,
    "min_period_months" INTEGER NOT NULL DEFAULT 1,
    "max_period_months" INTEGER NOT NULL DEFAULT 12,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "loan_applications" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "application_number" TEXT NOT NULL,
    "loan_type_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "student_code" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "class_name" TEXT,
    "academic_year" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "bill_id" TEXT,
    "principal" DECIMAL(14,2) NOT NULL,
    "interest" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "processing_fee" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_payable" DECIMAL(14,2) NOT NULL,
    "period_months" INTEGER NOT NULL,
    "frequency" "LoanFrequency" NOT NULL,
    "installment_amount" DECIMAL(14,2) NOT NULL,
    "disbursement" "LoanDisbursement" NOT NULL,
    "phone" TEXT,
    "bank_name" TEXT,
    "account_number_masked" TEXT,
    "account_holder" TEXT,
    "guarantor_name" TEXT,
    "guarantor_phone" TEXT,
    "guarantor_relation" TEXT,
    "purpose" TEXT NOT NULL,
    "schedule" JSONB,
    "status" "LoanStatus" NOT NULL DEFAULT 'UNDER_REVIEW',
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "loan_types_organization_id_code_key" ON "loan_types"("organization_id", "code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "loan_types_organization_id_is_active_idx" ON "loan_types"("organization_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "loan_applications_organization_id_application_number_key" ON "loan_applications"("organization_id", "application_number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "loan_applications_organization_id_status_idx" ON "loan_applications"("organization_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "loan_applications_student_code_idx" ON "loan_applications"("student_code");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_loan_type_id_fkey" FOREIGN KEY ("loan_type_id") REFERENCES "loan_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
