/*
  Warnings:

  - A unique constraint covering the columns `[organization_code]` on the table `organizations` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ModuleAssignmentStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'EXPIRED', 'PENDING');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrganizationType" ADD VALUE 'TVET';
ALTER TYPE "OrganizationType" ADD VALUE 'SACCO';
ALTER TYPE "OrganizationType" ADD VALUE 'COOPERATIVE';
ALTER TYPE "OrganizationType" ADD VALUE 'GOVERNMENT_INSTITUTION';
ALTER TYPE "OrganizationType" ADD VALUE 'HOTEL';

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "category" TEXT,
ADD COLUMN     "cell_id" TEXT,
ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'Rwanda',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "district_id" TEXT,
ADD COLUMN     "established_date" TIMESTAMP(3),
ADD COLUMN     "gps_coordinates" TEXT,
ADD COLUMN     "map_url" TEXT,
ADD COLUMN     "organization_code" TEXT,
ADD COLUMN     "physical_address" TEXT,
ADD COLUMN     "po_box" TEXT,
ADD COLUMN     "province_id" TEXT,
ADD COLUMN     "registration_number" TEXT,
ADD COLUMN     "sector_id" TEXT,
ADD COLUMN     "tin" TEXT,
ADD COLUMN     "village_id" TEXT,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "platform_modules" ADD COLUMN     "allow_trial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "backend_url" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "color" TEXT DEFAULT '#FCB038',
ADD COLUMN     "docs_url" TEXT,
ADD COLUMN     "frontend_url" TEXT,
ADD COLUMN     "health_check_url" TEXT,
ADD COLUMN     "icon" TEXT,
ADD COLUMN     "is_core" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_premium" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_public" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "license_type" TEXT,
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "maintenance_mode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "min_subscription_plan" TEXT,
ADD COLUMN     "required_permissions" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "short_name" TEXT,
ADD COLUMN     "version" TEXT NOT NULL DEFAULT '1.0.0',
ADD COLUMN     "visible_in_marketplace" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "module_dependencies" (
    "module_id" TEXT NOT NULL,
    "depends_on_module_id" TEXT NOT NULL,

    CONSTRAINT "module_dependencies_pkey" PRIMARY KEY ("module_id","depends_on_module_id")
);

-- CreateTable
CREATE TABLE "organization_modules" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "status" "ModuleAssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "subscription_plan" TEXT,
    "module_version" TEXT,
    "activated_by_id" TEXT,
    "activated_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "tenant_provisioned" BOOLEAN NOT NULL DEFAULT false,
    "tenant_provisioned_at" TIMESTAMP(3),
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_modules" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "assigned_by_id" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provinces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,

    CONSTRAINT "provinces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts" (
    "id" TEXT NOT NULL,
    "province_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sectors" (
    "id" TEXT NOT NULL,
    "district_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "sectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cells" (
    "id" TEXT NOT NULL,
    "sector_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "cells_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "villages" (
    "id" TEXT NOT NULL,
    "cell_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "villages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "district_org_counters" (
    "district_id" TEXT NOT NULL,
    "last_serial" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "district_org_counters_pkey" PRIMARY KEY ("district_id")
);

-- CreateTable
CREATE TABLE "organization_registrations" (
    "id" TEXT NOT NULL,
    "organization_code" TEXT,
    "organization_name" TEXT NOT NULL,
    "organization_type" "OrganizationType" NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'DRAFT',
    "payload" JSONB NOT NULL,
    "submitted_by_id" TEXT,
    "reviewed_by_id" TEXT,
    "organization_id" TEXT,
    "review_notes" TEXT,
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_profiles" (
    "organization_id" TEXT NOT NULL,
    "school_category" TEXT,
    "school_program" TEXT,
    "education_levels" JSONB NOT NULL DEFAULT '[]',
    "a_level_combinations" JSONB NOT NULL DEFAULT '[]',
    "tvet_trades" JSONB NOT NULL DEFAULT '[]',
    "curriculum" TEXT,
    "ownership" TEXT,
    "academic_year" TEXT,
    "school_motto" TEXT,
    "school_shift" TEXT,

    CONSTRAINT "school_profiles_pkey" PRIMARY KEY ("organization_id")
);

-- CreateTable
CREATE TABLE "hospital_profiles" (
    "organization_id" TEXT NOT NULL,
    "hospital_type" TEXT,
    "beds_capacity" INTEGER,
    "departments" JSONB NOT NULL DEFAULT '[]',
    "emergency_services" BOOLEAN NOT NULL DEFAULT false,
    "laboratory" BOOLEAN NOT NULL DEFAULT false,
    "pharmacy" BOOLEAN NOT NULL DEFAULT false,
    "operating_hours" TEXT,

    CONSTRAINT "hospital_profiles_pkey" PRIMARY KEY ("organization_id")
);

-- CreateTable
CREATE TABLE "factory_profiles" (
    "organization_id" TEXT NOT NULL,
    "industry" TEXT,
    "production_type" TEXT,
    "factory_size" TEXT,
    "employee_capacity" INTEGER,
    "working_shifts" JSONB NOT NULL DEFAULT '[]',
    "environmental_license" TEXT,

    CONSTRAINT "factory_profiles_pkey" PRIMARY KEY ("organization_id")
);

-- CreateTable
CREATE TABLE "church_profiles" (
    "organization_id" TEXT NOT NULL,
    "denomination" TEXT,
    "branch" TEXT,
    "diocese" TEXT,
    "service_days" JSONB NOT NULL DEFAULT '[]',
    "capacity" INTEGER,
    "youth_ministry" BOOLEAN NOT NULL DEFAULT false,
    "choir" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "church_profiles_pkey" PRIMARY KEY ("organization_id")
);

-- CreateTable
CREATE TABLE "company_profiles" (
    "organization_id" TEXT NOT NULL,
    "business_sector" TEXT,
    "industry" TEXT,
    "business_size" TEXT,
    "departments" JSONB NOT NULL DEFAULT '[]',
    "tax_category" TEXT,

    CONSTRAINT "company_profiles_pkey" PRIMARY KEY ("organization_id")
);

-- CreateIndex
CREATE INDEX "organization_modules_organization_id_status_idx" ON "organization_modules"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "organization_modules_organization_id_module_id_key" ON "organization_modules"("organization_id", "module_id");

-- CreateIndex
CREATE INDEX "user_modules_organization_id_idx" ON "user_modules"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_modules_user_id_module_id_key" ON "user_modules"("user_id", "module_id");

-- CreateIndex
CREATE UNIQUE INDEX "provinces_name_key" ON "provinces"("name");

-- CreateIndex
CREATE UNIQUE INDEX "provinces_code_key" ON "provinces"("code");

-- CreateIndex
CREATE UNIQUE INDEX "districts_code_key" ON "districts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "districts_province_id_name_key" ON "districts"("province_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "sectors_district_id_name_key" ON "sectors"("district_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "cells_sector_id_name_key" ON "cells"("sector_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "villages_cell_id_name_key" ON "villages"("cell_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "organization_registrations_organization_code_key" ON "organization_registrations"("organization_code");

-- CreateIndex
CREATE UNIQUE INDEX "organization_registrations_organization_id_key" ON "organization_registrations"("organization_id");

-- CreateIndex
CREATE INDEX "organization_registrations_status_created_at_idx" ON "organization_registrations"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_organization_code_key" ON "organizations"("organization_code");

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_cell_id_fkey" FOREIGN KEY ("cell_id") REFERENCES "cells"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_village_id_fkey" FOREIGN KEY ("village_id") REFERENCES "villages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_dependencies" ADD CONSTRAINT "module_dependencies_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "platform_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_dependencies" ADD CONSTRAINT "module_dependencies_depends_on_module_id_fkey" FOREIGN KEY ("depends_on_module_id") REFERENCES "platform_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_modules" ADD CONSTRAINT "organization_modules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_modules" ADD CONSTRAINT "organization_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "platform_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_modules" ADD CONSTRAINT "user_modules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_modules" ADD CONSTRAINT "user_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "platform_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "districts" ADD CONSTRAINT "districts_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sectors" ADD CONSTRAINT "sectors_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cells" ADD CONSTRAINT "cells_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "villages" ADD CONSTRAINT "villages_cell_id_fkey" FOREIGN KEY ("cell_id") REFERENCES "cells"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "district_org_counters" ADD CONSTRAINT "district_org_counters_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_registrations" ADD CONSTRAINT "organization_registrations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_profiles" ADD CONSTRAINT "school_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_profiles" ADD CONSTRAINT "hospital_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factory_profiles" ADD CONSTRAINT "factory_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "church_profiles" ADD CONSTRAINT "church_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_profiles" ADD CONSTRAINT "company_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
