ALTER TABLE "payroll_staff" ADD COLUMN "iam_user_id" TEXT;
ALTER TABLE "payroll_staff" ADD COLUMN "hr_employee_id" TEXT;
CREATE INDEX "payroll_staff_organization_id_iam_user_id_idx" ON "payroll_staff"("organization_id", "iam_user_id");
