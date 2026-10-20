ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "rfid_uid" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "fingerprint_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "identity_remarks" TEXT;
CREATE INDEX IF NOT EXISTS "users_organization_id_rfid_uid_idx" ON "users"("organization_id", "rfid_uid");
