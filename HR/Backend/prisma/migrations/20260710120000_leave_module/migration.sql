-- AlterEnum
ALTER TYPE "LeaveStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- CreateTable
CREATE TABLE "leave_policies" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "leave_type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT true,
    "max_days" INTEGER NOT NULL DEFAULT 0,
    "carry_forward" BOOLEAN NOT NULL DEFAULT false,
    "gender_restriction" TEXT NOT NULL DEFAULT 'ANY',
    "eligible_departments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "min_years_of_service" INTEGER NOT NULL DEFAULT 0,
    "approval_workflow" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "required_documents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leave_policies_organization_id_leave_type_key" ON "leave_policies"("organization_id", "leave_type");

-- CreateIndex
CREATE INDEX "leave_policies_organization_id_idx" ON "leave_policies"("organization_id");
