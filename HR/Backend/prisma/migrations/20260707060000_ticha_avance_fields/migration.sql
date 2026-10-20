ALTER TABLE "employees" ADD COLUMN "iam_user_id" TEXT;
ALTER TABLE "employees" ADD COLUMN "ticha_avance_eligible" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "employees_organization_id_iam_user_id_idx" ON "employees"("organization_id", "iam_user_id");
