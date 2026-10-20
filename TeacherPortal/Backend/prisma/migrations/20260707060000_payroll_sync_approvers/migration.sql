ALTER TABLE "staff_payroll_snapshots" ADD COLUMN "employee_number" TEXT;
ALTER TABLE "staff_payroll_snapshots" ADD COLUMN "display_name" TEXT;
ALTER TABLE "staff_payroll_snapshots" ADD COLUMN "ticha_avance_eligible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "staff_payroll_snapshots" ADD COLUMN "sync_source" TEXT;

CREATE TABLE "shule_avance_approvers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT,
    "display_name" TEXT,
    "role" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shule_avance_approvers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shule_avance_approvers_organization_id_user_id_role_key" ON "shule_avance_approvers"("organization_id", "user_id", "role");
CREATE INDEX "shule_avance_approvers_organization_id_role_idx" ON "shule_avance_approvers"("organization_id", "role");

ALTER TABLE "shule_avance_approvers" ADD CONSTRAINT "shule_avance_approvers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
