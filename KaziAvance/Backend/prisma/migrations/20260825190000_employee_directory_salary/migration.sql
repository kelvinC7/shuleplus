-- Production Kazi DBs were created with an older db push and never got later Employee columns.
-- Idempotent so this is safe on both old and already-updated databases.

ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "iamUserId" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "allowAdvance" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "maxAdvanceAmount" INTEGER;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "maxSalaryPercent" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "maxActiveAdvances" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "repaymentPeriodMonths" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "waitingPeriodDays" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "requireDocuments" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "directorySources" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "salarySource" TEXT NOT NULL DEFAULT 'missing';
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "salaryUpdatedAt" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "salaryUpdateReason" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "allowances" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "deductions" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "hireDate" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Employee_iamUserId_key" ON "Employee"("iamUserId");

ALTER TABLE "PayrollRecord" ADD COLUMN IF NOT EXISTS "allowances" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PayrollRecord" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'payroll-service';
ALTER TABLE "PayrollRecord" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'Approved';
ALTER TABLE "PayrollRecord" ADD COLUMN IF NOT EXISTS "reason" TEXT;

ALTER TABLE "AdvanceRequest" ADD COLUMN IF NOT EXISTS "remainingBalance" INTEGER;
ALTER TABLE "AdvanceRequest" ADD COLUMN IF NOT EXISTS "monthlyDeduction" INTEGER;
ALTER TABLE "AdvanceRequest" ADD COLUMN IF NOT EXISTS "signature" TEXT;
ALTER TABLE "AdvanceRequest" ADD COLUMN IF NOT EXISTS "signatureFile" TEXT;
ALTER TABLE "AdvanceRequest" ADD COLUMN IF NOT EXISTS "signatureMimeType" TEXT;
ALTER TABLE "AdvanceRequest" ADD COLUMN IF NOT EXISTS "reviewComment" TEXT;
ALTER TABLE "AdvanceRequest" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "AdvanceRequest" ADD COLUMN IF NOT EXISTS "disbursedAt" TIMESTAMP(3);
ALTER TABLE "AdvanceRequest" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);
