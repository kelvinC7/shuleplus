-- CreateTable
CREATE TABLE "gates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gate_officers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "gate_id" TEXT,
    "user_id" TEXT,
    "full_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "pin" TEXT,
    "role" TEXT NOT NULL DEFAULT 'Gate Officer',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gate_officers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gate_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "gate_id" TEXT NOT NULL,
    "permission_id" TEXT,
    "student_id" TEXT NOT NULL,
    "student_code" TEXT,
    "student_name" TEXT NOT NULL,
    "class_name" TEXT,
    "event_type" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "officer_id" TEXT,
    "officer_name" TEXT,
    "expected_time" TEXT,
    "actual_time" TIMESTAMP(3) NOT NULL,
    "variance_minutes" INTEGER,
    "variance_label" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gate_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gates_organization_id_name_key" ON "gates"("organization_id", "name");
CREATE INDEX "gates_organization_id_status_idx" ON "gates"("organization_id", "status");
CREATE INDEX "gate_officers_organization_id_status_idx" ON "gate_officers"("organization_id", "status");
CREATE INDEX "gate_logs_organization_id_created_at_idx" ON "gate_logs"("organization_id", "created_at");
CREATE INDEX "gate_logs_organization_id_student_id_idx" ON "gate_logs"("organization_id", "student_id");
CREATE INDEX "gate_logs_organization_id_event_type_idx" ON "gate_logs"("organization_id", "event_type");

ALTER TABLE "gates" ADD CONSTRAINT "gates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "gate_officers" ADD CONSTRAINT "gate_officers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "gate_officers" ADD CONSTRAINT "gate_officers_gate_id_fkey" FOREIGN KEY ("gate_id") REFERENCES "gates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "gate_logs" ADD CONSTRAINT "gate_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "gate_logs" ADD CONSTRAINT "gate_logs_gate_id_fkey" FOREIGN KEY ("gate_id") REFERENCES "gates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "gate_logs" ADD CONSTRAINT "gate_logs_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permission_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "gate_logs" ADD CONSTRAINT "gate_logs_officer_id_fkey" FOREIGN KEY ("officer_id") REFERENCES "gate_officers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
