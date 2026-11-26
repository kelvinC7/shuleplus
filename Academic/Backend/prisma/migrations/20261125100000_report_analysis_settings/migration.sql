ALTER TABLE "tenants"
ADD COLUMN IF NOT EXISTS "report_analysis_settings" JSONB;
