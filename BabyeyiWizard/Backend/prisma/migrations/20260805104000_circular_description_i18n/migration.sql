-- Sync Circular columns added in schema after initial migrate
ALTER TABLE "circulars" ADD COLUMN IF NOT EXISTS "include_school_description" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "circulars" ADD COLUMN IF NOT EXISTS "description_lines" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "circulars" ADD COLUMN IF NOT EXISTS "translation_status" TEXT NOT NULL DEFAULT 'pending';
