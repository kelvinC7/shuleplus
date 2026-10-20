-- AlterTable
ALTER TABLE "circulars" ADD COLUMN IF NOT EXISTS "announcements" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "circulars" ADD COLUMN IF NOT EXISTS "include_announcements" BOOLEAN NOT NULL DEFAULT false;
