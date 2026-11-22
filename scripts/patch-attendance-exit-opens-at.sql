-- Run once on attendance DB if Exit opens does not persist after save.
-- Example: psql "$DATABASE_URL" -f scripts/patch-attendance-exit-opens-at.sql

ALTER TABLE attendance_settings
  ADD COLUMN IF NOT EXISTS exit_opens_at VARCHAR(5);
