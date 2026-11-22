-- Multi-school device links and staff school access for shared attendance devices
CREATE TABLE IF NOT EXISTS "rfid_device_schools" (
  "id" TEXT NOT NULL,
  "device_id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rfid_device_schools_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "rfid_device_schools_device_id_organization_id_key"
  ON "rfid_device_schools"("device_id", "organization_id");
CREATE INDEX IF NOT EXISTS "rfid_device_schools_organization_id_status_idx"
  ON "rfid_device_schools"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "rfid_device_schools_device_id_status_idx"
  ON "rfid_device_schools"("device_id", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rfid_device_schools_device_id_fkey'
  ) THEN
    ALTER TABLE "rfid_device_schools"
      ADD CONSTRAINT "rfid_device_schools_device_id_fkey"
      FOREIGN KEY ("device_id") REFERENCES "rfid_devices"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Backfill: every existing device is primary for its owning organization
INSERT INTO "rfid_device_schools" ("id", "device_id", "organization_id", "is_primary", "status", "created_at", "updated_at")
SELECT
  'link_' || md5(d."id" || ':' || d."organization_id"),
  d."id",
  d."organization_id",
  true,
  'ACTIVE',
  COALESCE(d."created_at", CURRENT_TIMESTAMP),
  COALESCE(d."updated_at", CURRENT_TIMESTAMP)
FROM "rfid_devices" d
WHERE d."deleted_at" IS NULL
ON CONFLICT ("device_id", "organization_id") DO UPDATE
SET "is_primary" = EXCLUDED."is_primary",
    "status" = 'ACTIVE',
    "updated_at" = CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "attendance_staff_school_access" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "staff_key" TEXT NOT NULL,
  "iam_user_id" TEXT,
  "email" TEXT,
  "external_id" TEXT,
  "source" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attendance_staff_school_access_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "attendance_staff_school_access_organization_id_staff_key_key"
  ON "attendance_staff_school_access"("organization_id", "staff_key");
CREATE INDEX IF NOT EXISTS "attendance_staff_school_access_organization_id_status_idx"
  ON "attendance_staff_school_access"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "attendance_staff_school_access_iam_user_id_idx"
  ON "attendance_staff_school_access"("iam_user_id");
CREATE INDEX IF NOT EXISTS "attendance_staff_school_access_email_idx"
  ON "attendance_staff_school_access"("email");
CREATE INDEX IF NOT EXISTS "attendance_staff_school_access_external_id_source_idx"
  ON "attendance_staff_school_access"("external_id", "source");
