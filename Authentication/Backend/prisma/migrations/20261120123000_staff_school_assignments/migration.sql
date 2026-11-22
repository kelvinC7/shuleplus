-- General staff multi-school attendance/access assignments (no duplicate staff accounts)

DO $$ BEGIN
  CREATE TYPE "RepresentativeAssignmentStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "staff_school_assignments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "staff_key" TEXT NOT NULL,
    "iam_user_id" TEXT,
    "email" TEXT,
    "external_id" TEXT,
    "source" TEXT,
    "staff_name" TEXT,
    "home_organization_id" TEXT,
    "status" "RepresentativeAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_school_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "staff_school_assignments_organization_id_staff_key_key"
  ON "staff_school_assignments"("organization_id", "staff_key");

CREATE INDEX IF NOT EXISTS "staff_school_assignments_organization_id_status_idx"
  ON "staff_school_assignments"("organization_id", "status");

CREATE INDEX IF NOT EXISTS "staff_school_assignments_staff_key_status_idx"
  ON "staff_school_assignments"("staff_key", "status");

CREATE INDEX IF NOT EXISTS "staff_school_assignments_iam_user_id_idx"
  ON "staff_school_assignments"("iam_user_id");

CREATE INDEX IF NOT EXISTS "staff_school_assignments_email_idx"
  ON "staff_school_assignments"("email");

CREATE INDEX IF NOT EXISTS "staff_school_assignments_external_id_source_idx"
  ON "staff_school_assignments"("external_id", "source");

DO $$ BEGIN
  ALTER TABLE "staff_school_assignments"
    ADD CONSTRAINT "staff_school_assignments_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "staff_school_assignments"
    ADD CONSTRAINT "staff_school_assignments_iam_user_id_fkey"
    FOREIGN KEY ("iam_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "staff_school_assignments"
    ADD CONSTRAINT "staff_school_assignments_assigned_by_id_fkey"
    FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
