ALTER TABLE "smart_timetable_settings"
  ADD COLUMN IF NOT EXISTS "notify_department_head" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "alert_late_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "alert_missing_check_in_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "alert_missing_check_out_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "alert_early_departure_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "missing_check_in_after_minutes" INTEGER NOT NULL DEFAULT 10;
