-- CreateSchema
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "ShuleAvanceCatalogType" AS ENUM ('cashout', 'service');
CREATE TYPE "ShuleAvanceRequestType" AS ENUM ('cashout', 'service');
CREATE TYPE "ShuleAvanceRequestStatus" AS ENUM ('pending_accountant', 'sent_to_manager', 'approved', 'rejected_by_accountant', 'rejected_by_manager');

CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "organization_code" TEXT,
    "organization_name" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "shule_avance_max_percent" INTEGER NOT NULL DEFAULT 25,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenants_organization_id_key" ON "tenants"("organization_id");

CREATE TABLE "users_cache" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT,
    "display_name" TEXT,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_cache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_cache_organization_id_user_id_key" ON "users_cache"("organization_id", "user_id");

CREATE TABLE "shule_avance_catalog" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ShuleAvanceCatalogType" NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "interest_rate_bps" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shule_avance_catalog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shule_avance_catalog_organization_id_slug_key" ON "shule_avance_catalog"("organization_id", "slug");
CREATE INDEX "shule_avance_catalog_organization_id_idx" ON "shule_avance_catalog"("organization_id");

CREATE TABLE "shule_avance_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "request_type" "ShuleAvanceRequestType" NOT NULL,
    "service_category" TEXT,
    "status" "ShuleAvanceRequestStatus" NOT NULL DEFAULT 'sent_to_manager',
    "amount_rwf" INTEGER NOT NULL,
    "repayment_term_months" INTEGER NOT NULL,
    "reason" TEXT,
    "auto_approved" BOOLEAN NOT NULL DEFAULT false,
    "net_salary_baseline_rwf" INTEGER,
    "monthly_requested_total_rwf" INTEGER,
    "service_payload" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "manager_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shule_avance_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shule_avance_requests_organization_id_user_id_idx" ON "shule_avance_requests"("organization_id", "user_id");
CREATE INDEX "shule_avance_requests_organization_id_status_idx" ON "shule_avance_requests"("organization_id", "status");

CREATE TABLE "staff_payroll_snapshots" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "net_salary_rwf" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_payroll_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "staff_payroll_snapshots_organization_id_user_id_key" ON "staff_payroll_snapshots"("organization_id", "user_id");

CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "activity_logs_organization_id_idx" ON "activity_logs"("organization_id");

ALTER TABLE "shule_avance_catalog" ADD CONSTRAINT "shule_avance_catalog_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shule_avance_requests" ADD CONSTRAINT "shule_avance_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "staff_payroll_snapshots" ADD CONSTRAINT "staff_payroll_snapshots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
