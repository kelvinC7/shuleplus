-- AlterTable
ALTER TABLE "uniform_products" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "uniform_products" ADD COLUMN IF NOT EXISTS "metadata" JSONB NOT NULL DEFAULT '{}';
