-- CreateTable
CREATE TABLE "discipline_cases" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "case_number" TEXT NOT NULL,
    "student_id" TEXT,
    "student_code" TEXT,
    "student_name" TEXT NOT NULL,
    "class_name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Conduct',
    "severity" TEXT NOT NULL DEFAULT 'Medium',
    "status" TEXT NOT NULL DEFAULT 'Open',
    "incident_date" DATE NOT NULL,
    "description" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discipline_cases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "discipline_cases_organization_id_case_number_key" ON "discipline_cases"("organization_id", "case_number");
CREATE INDEX "discipline_cases_organization_id_class_name_idx" ON "discipline_cases"("organization_id", "class_name");
CREATE INDEX "discipline_cases_organization_id_student_code_idx" ON "discipline_cases"("organization_id", "student_code");

ALTER TABLE "discipline_cases" ADD CONSTRAINT "discipline_cases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
