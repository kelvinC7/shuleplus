-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "FollowUpPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "organization_code" TEXT,
    "organization_name" TEXT NOT NULL,
    "district" TEXT,
    "sector" TEXT,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "settings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_up_cases" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "case_number" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "school_name" TEXT NOT NULL,
    "issue" TEXT NOT NULL,
    "priority" "FollowUpPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "FollowUpStatus" NOT NULL DEFAULT 'OPEN',
    "assigned_to" TEXT,
    "follow_up_date" TIMESTAMP(3),
    "comments" JSONB DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_up_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_visits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "school_name" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "observations" JSONB DEFAULT '{}',
    "report" JSONB,

    CONSTRAINT "school_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_organization_id_key" ON "tenants"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "follow_up_cases_tenant_id_case_number_key" ON "follow_up_cases"("tenant_id", "case_number");

-- AddForeignKey
ALTER TABLE "follow_up_cases" ADD CONSTRAINT "follow_up_cases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_visits" ADD CONSTRAINT "school_visits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
