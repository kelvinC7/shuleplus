ALTER TABLE "payroll_runs" ADD COLUMN IF NOT EXISTS "run_overrides_json" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS "payroll_settings" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "current_academic_year" TEXT NOT NULL,
  "current_term" TEXT NOT NULL DEFAULT 'Term 1',
  "terms_json" JSONB NOT NULL DEFAULT '[]',
  "calendar_json" JSONB NOT NULL DEFAULT '{}',
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payroll_settings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_settings_organization_id_key" ON "payroll_settings"("organization_id");

CREATE TABLE IF NOT EXISTS "payroll_template_versions" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "snapshot_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_template_versions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "payroll_template_versions_organization_id_template_id_idx" ON "payroll_template_versions"("organization_id", "template_id");

CREATE TABLE IF NOT EXISTS "payroll_audit_logs" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "run_id" TEXT,
  "action" TEXT NOT NULL,
  "detail_json" JSONB NOT NULL DEFAULT '{}',
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "payroll_audit_logs_organization_id_run_id_idx" ON "payroll_audit_logs"("organization_id", "run_id");

CREATE TABLE IF NOT EXISTS "shule_avance_requests" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "staff_id" TEXT NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "monthly_payment" DECIMAL(14,2) NOT NULL,
  "remaining_balance" DECIMAL(14,2) NOT NULL,
  "repayment_months" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'APPROVED',
  "approved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "shule_avance_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "shule_avance_requests_organization_id_staff_id_status_idx" ON "shule_avance_requests"("organization_id", "staff_id", "status");
