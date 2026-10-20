ALTER TABLE "action_plan_attachments" ADD COLUMN IF NOT EXISTS "task_id" TEXT;
ALTER TABLE "action_plan_attachments" ADD COLUMN IF NOT EXISTS "verified_by" TEXT;
ALTER TABLE "action_plan_attachments" ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMP(3);

ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "funding_source" TEXT;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "budget_line_id" TEXT;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "budget_line_label" TEXT;

CREATE TABLE IF NOT EXISTS "period_reviews" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "review_type" TEXT NOT NULL,
  "period_year" INTEGER NOT NULL,
  "period_month" INTEGER,
  "period_quarter" INTEGER,
  "planned" TEXT,
  "completed" TEXT,
  "delayed" TEXT,
  "reason" TEXT,
  "corrective" TEXT,
  "new_deadline" TIMESTAMP(3),
  "responsible" TEXT,
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "period_reviews_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "period_reviews_organization_id_idx" ON "period_reviews"("organization_id");
CREATE INDEX IF NOT EXISTS "period_reviews_review_type_period_year_idx" ON "period_reviews"("review_type", "period_year");

CREATE INDEX IF NOT EXISTS "action_plan_attachments_task_id_idx" ON "action_plan_attachments"("task_id");
