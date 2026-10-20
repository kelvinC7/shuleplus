-- Chief Accountant (multi-school finance workspace)

DO $$ BEGIN
  CREATE TYPE "RepresentativeAssignmentStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "chief_accountant_profiles" (
    "user_id" TEXT NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "access_level" TEXT NOT NULL DEFAULT 'prepare',
    "approval_limit" DECIMAL(18,2),
    "enforce_mfa" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chief_accountant_profiles_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE IF NOT EXISTS "chief_accountant_assignments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "status" "RepresentativeAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "assigned_by_id" TEXT,
    "notes" TEXT,

    CONSTRAINT "chief_accountant_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "chief_accountant_assignments_user_id_organization_id_key"
  ON "chief_accountant_assignments"("user_id", "organization_id");

CREATE INDEX IF NOT EXISTS "chief_accountant_assignments_user_id_status_idx"
  ON "chief_accountant_assignments"("user_id", "status");

CREATE INDEX IF NOT EXISTS "chief_accountant_assignments_organization_id_status_idx"
  ON "chief_accountant_assignments"("organization_id", "status");

DO $$ BEGIN
  ALTER TABLE "chief_accountant_profiles"
    ADD CONSTRAINT "chief_accountant_profiles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "chief_accountant_assignments"
    ADD CONSTRAINT "chief_accountant_assignments_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "chief_accountant_assignments"
    ADD CONSTRAINT "chief_accountant_assignments_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "chief_accountant_assignments"
    ADD CONSTRAINT "chief_accountant_assignments_assigned_by_id_fkey"
    FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
