-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PayrollRunStatus" AS ENUM ('DRAFT', 'PROCESSING', 'PROCESSED', 'PAID');

-- CreateEnum
CREATE TYPE "TerminationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'REJECTED');

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
CREATE TABLE "payroll_staff" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_number" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "department" TEXT,
    "position" TEXT,
    "national_id" TEXT,
    "rssb_number" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "bank_name" TEXT,
    "bank_account" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_payroll_profiles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "basic_salary" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "transport_allowance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "housing_allowance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "others_allowance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "meal_allowance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "other_allowances" JSONB NOT NULL DEFAULT '[]',
    "use_net_to_gross" BOOLEAN NOT NULL DEFAULT false,
    "desired_net" DECIMAL(14,2),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_payroll_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default Template',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "statutory_rates" JSONB NOT NULL DEFAULT '{}',
    "paye_rates" JSONB NOT NULL DEFAULT '[]',
    "allowance_rules" JSONB NOT NULL DEFAULT '{}',
    "allowances" JSONB NOT NULL DEFAULT '[]',
    "deductions" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_deductions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "amount_type" TEXT NOT NULL DEFAULT 'fixed',
    "channel" TEXT NOT NULL DEFAULT 'tax',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_runs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "run_number" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "term" TEXT,
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
    "register_json" JSONB NOT NULL DEFAULT '[]',
    "totals_json" JSONB NOT NULL DEFAULT '{}',
    "payment_date" TIMESTAMP(3),
    "payment_ref" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_run_lines" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "line_json" JSONB NOT NULL,
    "payment_status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "payroll_run_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disbursement_rules" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deduction_type" TEXT NOT NULL,
    "apply_to" TEXT NOT NULL DEFAULT 'all',
    "amount" DECIMAL(14,2) NOT NULL,
    "amount_type" TEXT NOT NULL DEFAULT 'fixed',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disbursement_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "termination_benefits" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "termination_date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "years_worked" DECIMAL(5,2) NOT NULL,
    "severance_amount" DECIMAL(14,2) NOT NULL,
    "outstanding_deductions" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_payable" DECIMAL(14,2) NOT NULL,
    "status" "TerminationStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "termination_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslip_branding" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "school_name" TEXT,
    "logo_url" TEXT,
    "stamp_url" TEXT,
    "signature_url" TEXT,
    "footer_text" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payslip_branding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_organization_id_key" ON "tenants"("organization_id");

-- CreateIndex
CREATE INDEX "payroll_staff_organization_id_idx" ON "payroll_staff"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_staff_organization_id_employee_number_key" ON "payroll_staff"("organization_id", "employee_number");

-- CreateIndex
CREATE UNIQUE INDEX "staff_payroll_profiles_staff_id_key" ON "staff_payroll_profiles"("staff_id");

-- CreateIndex
CREATE INDEX "staff_payroll_profiles_organization_id_idx" ON "staff_payroll_profiles"("organization_id");

-- CreateIndex
CREATE INDEX "payroll_templates_organization_id_is_active_idx" ON "payroll_templates"("organization_id", "is_active");

-- CreateIndex
CREATE INDEX "employee_deductions_organization_id_staff_id_idx" ON "employee_deductions"("organization_id", "staff_id");

-- CreateIndex
CREATE INDEX "payroll_runs_organization_id_year_month_idx" ON "payroll_runs"("organization_id", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_runs_organization_id_run_number_key" ON "payroll_runs"("organization_id", "run_number");

-- CreateIndex
CREATE INDEX "payroll_run_lines_run_id_idx" ON "payroll_run_lines"("run_id");

-- CreateIndex
CREATE INDEX "disbursement_rules_organization_id_idx" ON "disbursement_rules"("organization_id");

-- CreateIndex
CREATE INDEX "termination_benefits_organization_id_status_idx" ON "termination_benefits"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payslip_branding_organization_id_key" ON "payslip_branding"("organization_id");

-- AddForeignKey
ALTER TABLE "staff_payroll_profiles" ADD CONSTRAINT "staff_payroll_profiles_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "payroll_staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_deductions" ADD CONSTRAINT "employee_deductions_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "payroll_staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run_lines" ADD CONSTRAINT "payroll_run_lines_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run_lines" ADD CONSTRAINT "payroll_run_lines_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "payroll_staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "termination_benefits" ADD CONSTRAINT "termination_benefits_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "payroll_staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
