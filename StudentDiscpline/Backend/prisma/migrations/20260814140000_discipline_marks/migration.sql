-- Discipline marks (rules)
CREATE TABLE "discipline_marks" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'General',
    "type" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "is_default" BOOLEAN NOT NULL DEFAULT true,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discipline_marks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "discipline_marks_organization_id_name_key" ON "discipline_marks"("organization_id", "name");
CREATE INDEX "discipline_marks_organization_id_status_idx" ON "discipline_marks"("organization_id", "status");

ALTER TABLE "discipline_marks" ADD CONSTRAINT "discipline_marks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Per-student discipline score
CREATE TABLE "student_discipline_balances" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "student_code" TEXT,
    "student_name" TEXT NOT NULL,
    "class_name" TEXT,
    "class_id" TEXT,
    "current_score" INTEGER NOT NULL DEFAULT 100,
    "max_score" INTEGER NOT NULL DEFAULT 100,
    "total_cases" INTEGER NOT NULL DEFAULT 0,
    "cases_this_term" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_discipline_balances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_discipline_balances_organization_id_student_id_key" ON "student_discipline_balances"("organization_id", "student_id");
CREATE INDEX "student_discipline_balances_organization_id_student_code_idx" ON "student_discipline_balances"("organization_id", "student_code");

ALTER TABLE "student_discipline_balances" ADD CONSTRAINT "student_discipline_balances_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Extend discipline cases
ALTER TABLE "discipline_cases" ADD COLUMN IF NOT EXISTS "mark_id" TEXT;
ALTER TABLE "discipline_cases" ADD COLUMN IF NOT EXISTS "mark_name" TEXT;
ALTER TABLE "discipline_cases" ADD COLUMN IF NOT EXISTS "custom_case_name" TEXT;
ALTER TABLE "discipline_cases" ADD COLUMN IF NOT EXISTS "applied_points" INTEGER;
ALTER TABLE "discipline_cases" ADD COLUMN IF NOT EXISTS "default_points" INTEGER;
ALTER TABLE "discipline_cases" ADD COLUMN IF NOT EXISTS "score_before" INTEGER;
ALTER TABLE "discipline_cases" ADD COLUMN IF NOT EXISTS "score_after" INTEGER;
ALTER TABLE "discipline_cases" ADD COLUMN IF NOT EXISTS "incident_time" TEXT;
ALTER TABLE "discipline_cases" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "discipline_cases" ADD COLUMN IF NOT EXISTS "actions_taken" JSONB;
ALTER TABLE "discipline_cases" ADD COLUMN IF NOT EXISTS "action_notes" TEXT;
ALTER TABLE "discipline_cases" ADD COLUMN IF NOT EXISTS "notify_parent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "discipline_cases" ADD COLUMN IF NOT EXISTS "notify_methods" JSONB;
ALTER TABLE "discipline_cases" ADD COLUMN IF NOT EXISTS "academic_year" TEXT;
ALTER TABLE "discipline_cases" ADD COLUMN IF NOT EXISTS "class_id" TEXT;
ALTER TABLE "discipline_cases" ADD COLUMN IF NOT EXISTS "evidence" JSONB;
ALTER TABLE "discipline_cases" ADD COLUMN IF NOT EXISTS "witnesses" JSONB;
ALTER TABLE "discipline_cases" ADD COLUMN IF NOT EXISTS "resolved_at" TIMESTAMP(3);

ALTER TABLE "discipline_cases" ADD CONSTRAINT "discipline_cases_mark_id_fkey" FOREIGN KEY ("mark_id") REFERENCES "discipline_marks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
