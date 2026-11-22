ALTER TABLE "tenants"
ADD COLUMN IF NOT EXISTS "report_footer_settings" JSONB;
