-- Organization discipline settings (default scores, etc.)
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "discipline_settings" JSONB;
