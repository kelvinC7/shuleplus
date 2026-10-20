-- CreateTable
CREATE TABLE "parent_communication_preferences" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "payment_reminders" JSONB NOT NULL DEFAULT '{"sms":true,"email":true,"push":true,"inApp":true}',
    "receipt_notifications" JSONB NOT NULL DEFAULT '{"sms":false,"email":true,"push":true,"inApp":true}',
    "scholarship_notifications" JSONB NOT NULL DEFAULT '{"sms":false,"email":true,"push":true,"inApp":true}',
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "web_push_token" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parent_communication_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parent_communication_preferences_parent_id_key" ON "parent_communication_preferences"("parent_id");

-- CreateIndex
CREATE INDEX "parent_communication_preferences_organization_id_idx" ON "parent_communication_preferences"("organization_id");

-- AddForeignKey
ALTER TABLE "parent_communication_preferences" ADD CONSTRAINT "parent_communication_preferences_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
