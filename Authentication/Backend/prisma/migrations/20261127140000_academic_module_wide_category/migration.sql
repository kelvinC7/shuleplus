-- Academic module: per-teacher marks access.
-- wide = true (default) means the teacher can submit marks for any class and
-- every Academic user can see those marks. wide = false limits the teacher to
-- their academic category (GENERAL_REB = Nursery/Primary/Secondary, TVET).
ALTER TABLE "user_modules"
  ADD COLUMN IF NOT EXISTS "wide" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "academic_category" TEXT NOT NULL DEFAULT 'GENERAL_REB';

CREATE INDEX IF NOT EXISTS "user_modules_organization_id_module_id_academic_category_idx"
  ON "user_modules" ("organization_id", "module_id", "academic_category");
