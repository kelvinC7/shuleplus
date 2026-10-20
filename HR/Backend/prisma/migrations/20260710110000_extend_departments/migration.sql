-- CreateEnum
CREATE TYPE "DepartmentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "departments" ADD COLUMN "code" TEXT,
ADD COLUMN "status" "DepartmentStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "department_type" TEXT,
ADD COLUMN "branch" TEXT,
ADD COLUMN "parent_department_id" TEXT,
ADD COLUMN "department_profile" JSONB DEFAULT '{}';

-- CreateIndex
CREATE UNIQUE INDEX "departments_organization_id_code_key" ON "departments"("organization_id", "code");

-- CreateIndex
CREATE INDEX "departments_parent_department_id_idx" ON "departments"("parent_department_id");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_parent_department_id_fkey" FOREIGN KEY ("parent_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
