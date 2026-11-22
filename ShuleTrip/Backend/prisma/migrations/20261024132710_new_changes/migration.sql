-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VALIDATION', 'UNDER_REVIEW', 'CORRECTION_REQUESTED', 'RESUBMITTED', 'AWAITING_ADDITIONAL_APPROVAL', 'APPROVED', 'REJECTED', 'TRIP_IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TripCategory" AS ENUM ('EDUCATIONAL', 'SPORTS', 'CULTURAL', 'COMMUNITY_SERVICE', 'OTHER');

-- CreateEnum
CREATE TYPE "ParticipantType" AS ENUM ('STUDENT');

-- CreateEnum
CREATE TYPE "DocumentVerificationStatus" AS ENUM ('NOT_REVIEWED', 'VERIFIED', 'MISSING', 'INVALID', 'EXPIRED', 'CORRECTION_REQUIRED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CORRECTION_REQUESTED', 'ESCALATED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "organization_code" TEXT,
    "organization_name" TEXT NOT NULL,
    "district" TEXT,
    "sector" TEXT,
    "school_code" TEXT,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "purpose" TEXT,
    "learning_objectives" TEXT,
    "category" "TripCategory" NOT NULL DEFAULT 'EDUCATIONAL',
    "academic_year" TEXT,
    "term" TEXT,
    "depart_at" TIMESTAMP(3),
    "return_at" TIMESTAMP(3),
    "destination" TEXT,
    "itinerary" TEXT,
    "estimated_distance_km" DOUBLE PRECISION,
    "is_international" BOOLEAN NOT NULL DEFAULT false,
    "trip_leader_name" TEXT,
    "emergency_contact" JSONB,
    "route_details" JSONB,
    "safety_details" JSONB,
    "correction_note" TEXT,
    "correction_due_at" TIMESTAMP(3),
    "status" "TripStatus" NOT NULL DEFAULT 'DRAFT',
    "safety_readiness" INTEGER NOT NULL DEFAULT 0,
    "wizard_step" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_participants" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "student_code" TEXT,
    "full_name" TEXT NOT NULL,
    "class_label" TEXT,
    "guardian_phone" TEXT,
    "photo_url" TEXT,
    "guardian_consent" BOOLEAN NOT NULL DEFAULT false,
    "participant_type" "ParticipantType" NOT NULL DEFAULT 'STUDENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_staff" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "staff_id" TEXT,
    "full_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "is_leader" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_vehicles" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "mode" TEXT,
    "plate_number" TEXT,
    "vehicle_type" TEXT,
    "capacity" INTEGER,
    "driver_name" TEXT,
    "driver_phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_documents" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "file_name" TEXT,
    "storage_key" TEXT,
    "issue_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "verification_status" "DocumentVerificationStatus" NOT NULL DEFAULT 'NOT_REVIEWED',
    "reviewer_comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_approvals" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "stage_key" TEXT NOT NULL,
    "stage_label" TEXT NOT NULL,
    "decision" "ApprovalDecision" NOT NULL DEFAULT 'PENDING',
    "decided_by_id" TEXT,
    "decided_by_name" TEXT,
    "reason" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_authorizations" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "authorization_no" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issued_by_name" TEXT,
    "verify_token_hash" TEXT,
    "revoked_at" TIMESTAMP(3),
    "conditions" TEXT,

    CONSTRAINT "trip_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_audit_logs" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT,
    "organization_id" TEXT,
    "actor_id" TEXT,
    "actor_name" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_policy_rules" (
    "id" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "rule_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_policy_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_organization_id_key" ON "tenants"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "trips_reference_key" ON "trips"("reference");

-- CreateIndex
CREATE INDEX "trips_organization_id_status_idx" ON "trips"("organization_id", "status");

-- CreateIndex
CREATE INDEX "trips_depart_at_idx" ON "trips"("depart_at");

-- CreateIndex
CREATE UNIQUE INDEX "trip_participants_trip_id_student_id_key" ON "trip_participants"("trip_id", "student_id");

-- CreateIndex
CREATE INDEX "trip_approvals_trip_id_idx" ON "trip_approvals"("trip_id");

-- CreateIndex
CREATE UNIQUE INDEX "trip_authorizations_trip_id_key" ON "trip_authorizations"("trip_id");

-- CreateIndex
CREATE UNIQUE INDEX "trip_authorizations_authorization_no_key" ON "trip_authorizations"("authorization_no");

-- CreateIndex
CREATE INDEX "trip_audit_logs_trip_id_idx" ON "trip_audit_logs"("trip_id");

-- CreateIndex
CREATE UNIQUE INDEX "trip_policy_rules_jurisdiction_rule_key_key" ON "trip_policy_rules"("jurisdiction", "rule_key");

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_participants" ADD CONSTRAINT "trip_participants_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_staff" ADD CONSTRAINT "trip_staff_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_vehicles" ADD CONSTRAINT "trip_vehicles_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_documents" ADD CONSTRAINT "trip_documents_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_approvals" ADD CONSTRAINT "trip_approvals_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_authorizations" ADD CONSTRAINT "trip_authorizations_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_audit_logs" ADD CONSTRAINT "trip_audit_logs_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;
