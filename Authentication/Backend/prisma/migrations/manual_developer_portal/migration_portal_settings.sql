-- Developer portal public API URL (Super Admin configurable)
CREATE TABLE IF NOT EXISTS "developer_portal_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "public_api_url" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by_id" TEXT,
    CONSTRAINT "developer_portal_settings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "developer_portal_settings"
  ADD COLUMN IF NOT EXISTS "public_api_url" TEXT,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updated_by_id" TEXT;

INSERT INTO "developer_portal_settings" ("id")
VALUES ('default')
ON CONFLICT ("id") DO NOTHING;
