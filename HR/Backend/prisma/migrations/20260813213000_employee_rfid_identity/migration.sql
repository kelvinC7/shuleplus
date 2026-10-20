ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "rfid_uid" TEXT;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "fingerprint_id" TEXT;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "identity_remarks" TEXT;
CREATE INDEX IF NOT EXISTS "employees_organization_id_rfid_uid_idx" ON "employees"("organization_id", "rfid_uid");
