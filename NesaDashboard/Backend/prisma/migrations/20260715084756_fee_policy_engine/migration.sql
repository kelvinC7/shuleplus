-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('PRIMARY', 'SECONDARY', 'TVET', 'TSS');

-- CreateEnum
CREATE TYPE "StudentType" AS ENUM ('DAY', 'BOARDING');

-- CreateTable
CREATE TABLE "fee_policies" (
    "id" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "term" INTEGER NOT NULL,
    "educationLevel" "EducationLevel" NOT NULL,
    "studentType" "StudentType" NOT NULL,
    "ownerships" JSONB NOT NULL,
    "applyToClasses" JSONB NOT NULL,
    "maxTuitionRwf" DECIMAL(14,2) NOT NULL,
    "status" "PolicyStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveDate" TIMESTAMP(3),
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "general_assembly_policies" (
    "id" TEXT NOT NULL,
    "levels" JSONB NOT NULL,
    "ownerships" JSONB NOT NULL,
    "studentTypes" JSONB NOT NULL,
    "maxAmountRwf" DECIMAL(14,2) NOT NULL,
    "requireApproval" BOOLEAN NOT NULL DEFAULT true,
    "maxTimesPerTerm" INTEGER NOT NULL DEFAULT 1,
    "allowMultipleCharges" BOOLEAN NOT NULL DEFAULT false,
    "requireAttachment" BOOLEAN NOT NULL DEFAULT false,
    "attachmentTypes" JSONB NOT NULL DEFAULT '[]',
    "description" TEXT,
    "status" "PolicyStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveDate" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "general_assembly_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_audit_logs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fee_policies_status_academicYear_term_educationLevel_studen_idx" ON "fee_policies"("status", "academicYear", "term", "educationLevel", "studentType");

-- CreateIndex
CREATE INDEX "general_assembly_policies_status_idx" ON "general_assembly_policies"("status");

-- CreateIndex
CREATE INDEX "policy_audit_logs_entityType_entityId_idx" ON "policy_audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "policy_audit_logs_createdAt_idx" ON "policy_audit_logs"("createdAt");
