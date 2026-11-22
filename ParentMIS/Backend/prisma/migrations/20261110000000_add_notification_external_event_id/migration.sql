ALTER TABLE "notifications"
ADD COLUMN IF NOT EXISTS "external_event_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "notifications_organization_id_external_event_id_key"
ON "notifications"("organization_id", "external_event_id");