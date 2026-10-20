-- Student permission requests
CREATE TABLE "permission_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "reference_number" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "student_code" TEXT,
    "student_name" TEXT NOT NULL,
    "class_name" TEXT NOT NULL,
    "class_id" TEXT,
    "academic_year" TEXT,
    "term" TEXT,
    "permission_type" TEXT NOT NULL,
    "custom_type" TEXT,
    "reason" TEXT NOT NULL,
    "departure_date" DATE NOT NULL,
    "departure_time" TEXT NOT NULL,
    "expected_return_date" DATE NOT NULL,
    "expected_return_time" TEXT NOT NULL,
    "duration_minutes" INTEGER,
    "leaving_with" TEXT NOT NULL,
    "guardian_name" TEXT,
    "guardian_relationship" TEXT,
    "guardian_phone" TEXT,
    "authorized_person_name" TEXT,
    "authorized_person_relationship" TEXT,
    "authorized_person_phone" TEXT,
    "authorized_person_id" TEXT,
    "requested_by" TEXT NOT NULL,
    "requested_by_name" TEXT,
    "approval_chain" JSONB,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "actual_departure_at" TIMESTAMP(3),
    "actual_return_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permission_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "permission_requests_organization_id_reference_number_key" ON "permission_requests"("organization_id", "reference_number");
CREATE INDEX "permission_requests_organization_id_status_idx" ON "permission_requests"("organization_id", "status");
CREATE INDEX "permission_requests_organization_id_student_id_idx" ON "permission_requests"("organization_id", "student_id");
CREATE INDEX "permission_requests_organization_id_departure_date_idx" ON "permission_requests"("organization_id", "departure_date");

ALTER TABLE "permission_requests" ADD CONSTRAINT "permission_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "permission_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "actor_name" TEXT,
    "actor_role" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "permission_events_permission_id_idx" ON "permission_events"("permission_id");

ALTER TABLE "permission_events" ADD CONSTRAINT "permission_events_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permission_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
