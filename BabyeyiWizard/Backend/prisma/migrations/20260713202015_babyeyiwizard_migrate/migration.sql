-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CircularStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ApprovalStage" AS ENUM ('DIRECTOR', 'ACCOUNTANT', 'DISTRICT', 'NESA');

-- CreateEnum
CREATE TYPE "ApprovalAction" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DIRECTOR_APPROVED', 'PAYMENT_UPDATED', 'REQUIREMENT_ADDED', 'CIRCULAR_PUBLISHED', 'QR_GENERATED', 'PARENT_DOWNLOADED', 'COMMENT_ADDED', 'REMINDER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('LOGO', 'STAMP', 'SIGNATURE', 'OTHER_LOGO', 'LETTERHEAD', 'FOOTER');

-- CreateEnum
CREATE TYPE "SchoolOwnership" AS ENUM ('GOVERNMENT', 'GOVERNMENT_AIDED', 'PRIVATE');

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
CREATE TABLE "school_profiles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "school_name" TEXT NOT NULL,
    "school_code" TEXT,
    "ownership_type" "SchoolOwnership" NOT NULL DEFAULT 'GOVERNMENT',
    "academic_year" TEXT NOT NULL DEFAULT '2025-2026',
    "principal_name" TEXT,
    "province" TEXT,
    "district" TEXT,
    "sector" TEXT,
    "cell" TEXT,
    "village" TEXT,
    "logo_path" TEXT,
    "stamp_path" TEXT,
    "signature_path" TEXT,
    "other_logo_path" TEXT,
    "letterhead_path" TEXT,
    "footer_path" TEXT,
    "theme_color" TEXT NOT NULL DEFAULT '#FCB038',
    "font_family" TEXT NOT NULL DEFAULT 'Montserrat',
    "verification_status" TEXT NOT NULL DEFAULT 'pending',
    "school_status" TEXT NOT NULL DEFAULT 'active',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circulars" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "class_name" TEXT NOT NULL,
    "classes" JSONB NOT NULL DEFAULT '[]',
    "education_level" TEXT,
    "school_category" TEXT NOT NULL,
    "ownership_type" TEXT NOT NULL,
    "fee_target_students" TEXT NOT NULL DEFAULT 'public',
    "province" TEXT,
    "district" TEXT,
    "sector" TEXT,
    "cell" TEXT,
    "village" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "parent_message" TEXT,
    "payments" JSONB NOT NULL DEFAULT '[]',
    "requirements" JSONB NOT NULL DEFAULT '[]',
    "banks" JSONB NOT NULL DEFAULT '[]',
    "class_reqs" JSONB NOT NULL DEFAULT '[]',
    "other_infos" JSONB NOT NULL DEFAULT '[]',
    "leaders" JSONB NOT NULL DEFAULT '[]',
    "status" "CircularStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "published_by" TEXT,
    "published_at" TIMESTAMP(3),
    "qr_code_path" TEXT,
    "qr_hash" TEXT,
    "pdf_path" TEXT,
    "request_increase" BOOLEAN NOT NULL DEFAULT false,
    "increase_reason" TEXT,
    "increase_desc" TEXT,
    "request_reasons" JSONB NOT NULL DEFAULT '[]',
    "nesa_status" TEXT,
    "total_fee" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "nesa_limit" DECIMAL(14,2),
    "author_id" TEXT,
    "author_name" TEXT,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "qr_scan_count" INTEGER NOT NULL DEFAULT 0,
    "share_count" INTEGER NOT NULL DEFAULT 0,
    "content_i18n" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "circulars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circular_versions" (
    "id" TEXT NOT NULL,
    "circular_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "change_type" TEXT NOT NULL,
    "changed_by" TEXT,
    "changed_by_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "circular_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circular_approvals" (
    "id" TEXT NOT NULL,
    "circular_id" TEXT NOT NULL,
    "stage" "ApprovalStage" NOT NULL,
    "action" "ApprovalAction" NOT NULL DEFAULT 'PENDING',
    "requested_by" TEXT,
    "approver_name" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "acted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "circular_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circular_activities" (
    "id" TEXT NOT NULL,
    "circular_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actor_name" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "circular_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circular_comments" (
    "id" TEXT NOT NULL,
    "circular_id" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "circular_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circular_collaborators" (
    "id" TEXT NOT NULL,
    "circular_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "is_editing" BOOLEAN NOT NULL DEFAULT false,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "circular_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "school_type" TEXT NOT NULL,
    "description" TEXT,
    "preview_data" JSONB NOT NULL DEFAULT '{}',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_assets" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "asset_type" "AssetType" NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "mime_type" TEXT,
    "file_size" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "circular_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_catalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" TEXT NOT NULL DEFAULT '1',
    "category" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "requirement_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nesa_fee_limits" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "district" TEXT,
    "limit_rwf" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "nesa_fee_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "actor_name" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registered_classes" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "education_level" TEXT NOT NULL,

    CONSTRAINT "registered_classes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_organization_id_key" ON "tenants"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "school_profiles_organization_id_key" ON "school_profiles"("organization_id");

-- CreateIndex
CREATE INDEX "circulars_organization_id_idx" ON "circulars"("organization_id");

-- CreateIndex
CREATE INDEX "circulars_status_idx" ON "circulars"("status");

-- CreateIndex
CREATE INDEX "circulars_academic_year_idx" ON "circulars"("academic_year");

-- CreateIndex
CREATE INDEX "circular_versions_circular_id_idx" ON "circular_versions"("circular_id");

-- CreateIndex
CREATE INDEX "circular_approvals_circular_id_idx" ON "circular_approvals"("circular_id");

-- CreateIndex
CREATE INDEX "circular_approvals_stage_action_idx" ON "circular_approvals"("stage", "action");

-- CreateIndex
CREATE INDEX "circular_activities_circular_id_idx" ON "circular_activities"("circular_id");

-- CreateIndex
CREATE INDEX "circular_comments_circular_id_idx" ON "circular_comments"("circular_id");

-- CreateIndex
CREATE INDEX "circular_collaborators_circular_id_idx" ON "circular_collaborators"("circular_id");

-- CreateIndex
CREATE INDEX "templates_organization_id_idx" ON "templates"("organization_id");

-- CreateIndex
CREATE INDEX "templates_category_idx" ON "templates"("category");

-- CreateIndex
CREATE INDEX "school_assets_organization_id_idx" ON "school_assets"("organization_id");

-- CreateIndex
CREATE INDEX "notifications_organization_id_idx" ON "notifications"("organization_id");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- CreateIndex
CREATE UNIQUE INDEX "nesa_fee_limits_level_term_category_district_key" ON "nesa_fee_limits"("level", "term", "category", "district");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_idx" ON "audit_logs"("organization_id");

-- CreateIndex
CREATE INDEX "registered_classes_organization_id_idx" ON "registered_classes"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "registered_classes_organization_id_label_key" ON "registered_classes"("organization_id", "label");

-- AddForeignKey
ALTER TABLE "school_profiles" ADD CONSTRAINT "school_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circulars" ADD CONSTRAINT "circulars_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circular_versions" ADD CONSTRAINT "circular_versions_circular_id_fkey" FOREIGN KEY ("circular_id") REFERENCES "circulars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circular_approvals" ADD CONSTRAINT "circular_approvals_circular_id_fkey" FOREIGN KEY ("circular_id") REFERENCES "circulars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circular_activities" ADD CONSTRAINT "circular_activities_circular_id_fkey" FOREIGN KEY ("circular_id") REFERENCES "circulars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circular_comments" ADD CONSTRAINT "circular_comments_circular_id_fkey" FOREIGN KEY ("circular_id") REFERENCES "circulars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circular_collaborators" ADD CONSTRAINT "circular_collaborators_circular_id_fkey" FOREIGN KEY ("circular_id") REFERENCES "circulars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_assets" ADD CONSTRAINT "school_assets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE CASCADE ON UPDATE CASCADE;
