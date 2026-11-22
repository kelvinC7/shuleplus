-- CreateEnum
CREATE TYPE "SmsQuotaPeriod" AS ENUM ('MONTHLY', 'TERM', 'ANNUAL', 'ONE_TIME');
CREATE TYPE "SmsCampaignMode" AS ENUM ('SELECTED_STUDENTS', 'CUSTOM_NUMBERS', 'BULK_CLASS', 'BULK_SCHOOL');
CREATE TYPE "SmsCampaignStatus" AS ENUM ('DRAFT', 'QUEUED', 'SENDING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "SmsRecipientStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'SKIPPED');
CREATE TYPE "SmsParentTarget" AS ENUM ('FATHER', 'MOTHER', 'BOTH');

CREATE TABLE "sms_school_settings" (
    "organization_id" TEXT NOT NULL,
    "sms_enabled" BOOLEAN NOT NULL DEFAULT false,
    "max_segments" INTEGER NOT NULL DEFAULT 0,
    "quota_period" "SmsQuotaPeriod" NOT NULL DEFAULT 'MONTHLY',
    "segments_used" INTEGER NOT NULL DEFAULT 0,
    "period_started_at" TIMESTAMP(3),
    "warn_at_80" BOOLEAN NOT NULL DEFAULT true,
    "warn_at_90" BOOLEAN NOT NULL DEFAULT true,
    "block_at_limit" BOOLEAN NOT NULL DEFAULT true,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_school_settings_pkey" PRIMARY KEY ("organization_id")
);

CREATE TABLE "sms_campaigns" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "mode" "SmsCampaignMode" NOT NULL,
    "status" "SmsCampaignStatus" NOT NULL DEFAULT 'QUEUED',
    "title" TEXT,
    "template_body" TEXT NOT NULL,
    "parent_target" "SmsParentTarget",
    "class_filter" TEXT,
    "sender_user_id" TEXT NOT NULL,
    "sender_email" TEXT,
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "segments_total" INTEGER NOT NULL DEFAULT 0,
    "delivered_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "pending_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "sms_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sms_recipients" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "phone_normalized" TEXT NOT NULL,
    "phone_masked" TEXT NOT NULL,
    "parent_name" TEXT,
    "parent_role" TEXT,
    "student_summary" TEXT,
    "message_body" TEXT NOT NULL,
    "segments" INTEGER NOT NULL DEFAULT 1,
    "status" "SmsRecipientStatus" NOT NULL DEFAULT 'QUEUED',
    "failure_reason" TEXT,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_recipients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sms_quota_ledger" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "delta_segments" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "campaign_id" TEXT,
    "actor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_quota_ledger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sms_recipients_campaign_id_phone_normalized_key" ON "sms_recipients"("campaign_id", "phone_normalized");
CREATE INDEX "sms_campaigns_organization_id_created_at_idx" ON "sms_campaigns"("organization_id", "created_at");
CREATE INDEX "sms_recipients_campaign_id_status_idx" ON "sms_recipients"("campaign_id", "status");
CREATE INDEX "sms_quota_ledger_organization_id_created_at_idx" ON "sms_quota_ledger"("organization_id", "created_at");

ALTER TABLE "sms_campaigns" ADD CONSTRAINT "sms_campaigns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sms_school_settings"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sms_recipients" ADD CONSTRAINT "sms_recipients_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "sms_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
