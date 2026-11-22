-- CreateTable
CREATE TABLE "discipline_settings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "default_max_score" INTEGER NOT NULL DEFAULT 100,
    "default_starting_score" INTEGER NOT NULL DEFAULT 100,
    "auto_initialize_students" BOOLEAN NOT NULL DEFAULT true,
    "absence_deduction_enabled" BOOLEAN NOT NULL DEFAULT true,
    "absence_deduction_points" INTEGER NOT NULL DEFAULT 4,
    "auto_absence_deduction_enabled" BOOLEAN NOT NULL DEFAULT false,
    "auto_absence_last_run_date" TEXT,
    "late_deduction_enabled" BOOLEAN NOT NULL DEFAULT true,
    "late_deduction_points" INTEGER NOT NULL DEFAULT 2,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discipline_settings_pkey" PRIMARY KEY ("id")
);

-- Backfill from existing tenant JSON settings (if any)
INSERT INTO "discipline_settings" (
    "id",
    "organization_id",
    "default_max_score",
    "default_starting_score",
    "auto_initialize_students",
    "absence_deduction_enabled",
    "absence_deduction_points",
    "auto_absence_deduction_enabled",
    "auto_absence_last_run_date",
    "late_deduction_enabled",
    "late_deduction_points",
    "created_at",
    "updated_at"
)
SELECT
    md5(random()::text || clock_timestamp()::text || t."organization_id") AS "id",
    t."organization_id",
    COALESCE(
      CASE WHEN (t."discipline_settings"->>'defaultMaxScore') ~ '^-?\d+$'
        THEN LEAST(1000, GREATEST(1, (t."discipline_settings"->>'defaultMaxScore')::int))
      END, 100
    ) AS "default_max_score",
    LEAST(
      COALESCE(
        CASE WHEN (t."discipline_settings"->>'defaultStartingScore') ~ '^-?\d+$'
          THEN GREATEST(0, (t."discipline_settings"->>'defaultStartingScore')::int)
        END, 100
      ),
      COALESCE(
        CASE WHEN (t."discipline_settings"->>'defaultMaxScore') ~ '^-?\d+$'
          THEN LEAST(1000, GREATEST(1, (t."discipline_settings"->>'defaultMaxScore')::int))
        END, 100
      )
    ) AS "default_starting_score",
    COALESCE((t."discipline_settings"->>'autoInitializeStudents')::boolean, true) AS "auto_initialize_students",
    COALESCE((t."discipline_settings"->>'absenceDeductionEnabled')::boolean, true) AS "absence_deduction_enabled",
    COALESCE(
      CASE WHEN (t."discipline_settings"->>'absenceDeductionPoints') ~ '^-?\d+$'
        THEN LEAST(100, GREATEST(0, (t."discipline_settings"->>'absenceDeductionPoints')::int))
      END, 4
    ) AS "absence_deduction_points",
    COALESCE((t."discipline_settings"->>'autoAbsenceDeductionEnabled')::boolean, false) AS "auto_absence_deduction_enabled",
    CASE
      WHEN (t."discipline_settings"->>'autoAbsenceLastRunDate') ~ '^\d{4}-\d{2}-\d{2}$'
        THEN t."discipline_settings"->>'autoAbsenceLastRunDate'
      ELSE NULL
    END AS "auto_absence_last_run_date",
    COALESCE((t."discipline_settings"->>'lateDeductionEnabled')::boolean, true) AS "late_deduction_enabled",
    COALESCE(
      CASE WHEN (t."discipline_settings"->>'lateDeductionPoints') ~ '^-?\d+$'
        THEN LEAST(100, GREATEST(0, (t."discipline_settings"->>'lateDeductionPoints')::int))
      END, 2
    ) AS "late_deduction_points",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "tenants" t
ON CONFLICT ("organization_id") DO NOTHING;

-- CreateIndex
CREATE UNIQUE INDEX "discipline_settings_organization_id_key" ON "discipline_settings"("organization_id");

-- AddForeignKey
ALTER TABLE "discipline_settings"
  ADD CONSTRAINT "discipline_settings_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop legacy JSON column now stored in discipline_settings table
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "discipline_settings";
