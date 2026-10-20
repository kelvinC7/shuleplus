-- CreateEnum
CREATE TYPE "ModuleAccessLevel" AS ENUM ('USER', 'HEAD');

-- AlterTable users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "branch" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "position" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "employee_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "supervisor_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "activated_at" TIMESTAMP(3);

-- AlterTable user_modules
ALTER TABLE "user_modules" ADD COLUMN IF NOT EXISTS "access_level" "ModuleAccessLevel" NOT NULL DEFAULT 'USER';
ALTER TABLE "user_modules" ADD COLUMN IF NOT EXISTS "data_scope" "DataScope" NOT NULL DEFAULT 'SELF';

-- Indexes
CREATE INDEX IF NOT EXISTS "users_organization_id_department_idx" ON "users"("organization_id", "department");
CREATE INDEX IF NOT EXISTS "user_modules_organization_id_module_id_access_level_idx" ON "user_modules"("organization_id", "module_id", "access_level");

-- Foreign key: supervisor
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_supervisor_id_fkey"
    FOREIGN KEY ("supervisor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
