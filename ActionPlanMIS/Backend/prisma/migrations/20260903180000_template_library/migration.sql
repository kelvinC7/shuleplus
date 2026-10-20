-- Template library: categories, ownership, official templates
ALTER TABLE "action_plan_templates" ADD COLUMN IF NOT EXISTS "category_id" TEXT;
ALTER TABLE "action_plan_templates" ADD COLUMN IF NOT EXISTS "ownership" TEXT NOT NULL DEFAULT 'school';
ALTER TABLE "action_plan_templates" ADD COLUMN IF NOT EXISTS "is_official" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "action_plan_templates" ADD COLUMN IF NOT EXISTS "official_slug" TEXT;
ALTER TABLE "action_plan_templates" ADD COLUMN IF NOT EXISTS "source_plan_id" TEXT;
ALTER TABLE "action_plan_templates" ADD COLUMN IF NOT EXISTS "school_type" TEXT;

CREATE INDEX IF NOT EXISTS "action_plan_templates_organization_id_category_id_idx" ON "action_plan_templates"("organization_id", "category_id");
CREATE INDEX IF NOT EXISTS "action_plan_templates_organization_id_ownership_idx" ON "action_plan_templates"("organization_id", "ownership");

CREATE UNIQUE INDEX IF NOT EXISTS "action_plan_templates_organization_id_official_slug_key" ON "action_plan_templates"("organization_id", "official_slug");
