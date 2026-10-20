-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'PROBATION', 'SUSPENDED', 'ON_LEAVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('PERMANENT', 'CONTRACT', 'TEMPORARY', 'PROBATION', 'INTERNSHIP', 'PART_TIME', 'CONSULTANCY');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');

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
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "head_name" TEXT,
    "budget" DECIMAL(14,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_categories" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employment_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_number" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "middle_name" TEXT,
    "last_name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "national_id" TEXT,
    "photo_url" TEXT,
    "department_id" TEXT,
    "category_id" TEXT,
    "position" TEXT NOT NULL,
    "contract_type" "ContractType" NOT NULL DEFAULT 'PERMANENT',
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "hire_date" TIMESTAMP(3) NOT NULL,
    "contract_end" TIMESTAMP(3),
    "ongoing_contract" BOOLEAN NOT NULL DEFAULT false,
    "basic_salary" DECIMAL(14,2),
    "hr_profile" JSONB NOT NULL DEFAULT '{}',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qualifications" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "field" TEXT,
    "institution" TEXT,
    "year" INTEGER,
    "grade" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qualifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_documents" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "file_path" TEXT,
    "mime_type" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "leave_type" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "total_days" INTEGER NOT NULL,
    "reason" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "applied_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_organization_id_key" ON "tenants"("organization_id");

-- CreateIndex
CREATE INDEX "departments_organization_id_idx" ON "departments"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_organization_id_name_key" ON "departments"("organization_id", "name");

-- CreateIndex
CREATE INDEX "employment_categories_organization_id_idx" ON "employment_categories"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "employment_categories_organization_id_name_key" ON "employment_categories"("organization_id", "name");

-- CreateIndex
CREATE INDEX "employees_organization_id_idx" ON "employees"("organization_id");

-- CreateIndex
CREATE INDEX "employees_organization_id_status_idx" ON "employees"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "employees_organization_id_employee_number_key" ON "employees"("organization_id", "employee_number");

-- CreateIndex
CREATE INDEX "qualifications_organization_id_idx" ON "qualifications"("organization_id");

-- CreateIndex
CREATE INDEX "qualifications_employee_id_idx" ON "qualifications"("employee_id");

-- CreateIndex
CREATE INDEX "employee_documents_organization_id_idx" ON "employee_documents"("organization_id");

-- CreateIndex
CREATE INDEX "employee_documents_employee_id_idx" ON "employee_documents"("employee_id");

-- CreateIndex
CREATE INDEX "leave_requests_organization_id_idx" ON "leave_requests"("organization_id");

-- CreateIndex
CREATE INDEX "leave_requests_employee_id_idx" ON "leave_requests"("employee_id");

-- CreateIndex
CREATE INDEX "leave_requests_organization_id_status_idx" ON "leave_requests"("organization_id", "status");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "employment_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualifications" ADD CONSTRAINT "qualifications_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
