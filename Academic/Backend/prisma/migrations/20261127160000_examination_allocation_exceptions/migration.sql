-- Intelligent examination allocation: optional same-class-level exceptions.
ALTER TABLE "examination_lists"
  ADD COLUMN IF NOT EXISTS "allow_same_class_exceptions" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "exception_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "allocation_meta" JSONB;

ALTER TABLE "examination_allocations"
  ADD COLUMN IF NOT EXISTS "is_exception" BOOLEAN NOT NULL DEFAULT false;
