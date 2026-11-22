-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('DIRECT', 'GROUP', 'DEPARTMENT', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "ChatMemberKind" AS ENUM ('STAFF', 'PARENT');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE');

-- CreateEnum
CREATE TYPE "SmsQuotaPeriod" AS ENUM ('MONTHLY', 'TERM', 'ANNUAL', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "SmsCampaignMode" AS ENUM ('SELECTED_STUDENTS', 'CUSTOM_NUMBERS', 'BULK_CLASS', 'BULK_SCHOOL');

-- CreateEnum
CREATE TYPE "SmsCampaignStatus" AS ENUM ('DRAFT', 'QUEUED', 'SENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SmsRecipientStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "SmsParentTarget" AS ENUM ('FATHER', 'MOTHER', 'BOTH');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "organization_code" TEXT,
    "organization_name" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_members" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" "ChatMemberKind" NOT NULL DEFAULT 'STAFF',
    "email" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "avatar_url" TEXT,
    "department" TEXT,
    "position" TEXT,
    "source" TEXT DEFAULT 'iam',
    "has_account" BOOLEAN NOT NULL DEFAULT false,
    "role_slugs" JSONB,
    "last_seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "type" "ConversationType" NOT NULL DEFAULT 'DIRECT',
    "name" TEXT,
    "department" TEXT,
    "description" TEXT,
    "created_by_id" TEXT NOT NULL,
    "last_message_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_members" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "muted_at" TIMESTAMP(3),
    "last_read_at" TIMESTAMP(3),
    "last_read_message_id" TEXT,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "body" TEXT,
    "attachment_url" TEXT,
    "attachment_name" TEXT,
    "attachment_mime" TEXT,
    "attachment_size" INTEGER,
    "edited_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "tenants_organization_id_key" ON "tenants"("organization_id");

-- CreateIndex
CREATE INDEX "chat_members_organization_id_department_idx" ON "chat_members"("organization_id", "department");

-- CreateIndex
CREATE INDEX "chat_members_organization_id_kind_idx" ON "chat_members"("organization_id", "kind");

-- CreateIndex
CREATE INDEX "chat_members_organization_id_source_idx" ON "chat_members"("organization_id", "source");

-- CreateIndex
CREATE UNIQUE INDEX "chat_members_organization_id_user_id_key" ON "chat_members"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "conversations_organization_id_type_idx" ON "conversations"("organization_id", "type");

-- CreateIndex
CREATE INDEX "conversations_organization_id_department_idx" ON "conversations"("organization_id", "department");

-- CreateIndex
CREATE INDEX "conversations_organization_id_last_message_at_idx" ON "conversations"("organization_id", "last_message_at");

-- CreateIndex
CREATE INDEX "conversation_members_user_id_idx" ON "conversation_members"("user_id");

-- CreateIndex
CREATE INDEX "conversation_members_conversation_id_idx" ON "conversation_members"("conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_members_conversation_id_user_id_key" ON "conversation_members"("conversation_id", "user_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_conversation_id_id_idx" ON "messages"("conversation_id", "id");

-- CreateIndex
CREATE INDEX "messages_organization_id_idx" ON "messages"("organization_id");

-- CreateIndex
CREATE INDEX "sms_campaigns_organization_id_created_at_idx" ON "sms_campaigns"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "sms_recipients_campaign_id_status_idx" ON "sms_recipients"("campaign_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "sms_recipients_campaign_id_phone_normalized_key" ON "sms_recipients"("campaign_id", "phone_normalized");

-- CreateIndex
CREATE INDEX "sms_quota_ledger_organization_id_created_at_idx" ON "sms_quota_ledger"("organization_id", "created_at");

-- AddForeignKey
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_organization_id_user_id_fkey" FOREIGN KEY ("organization_id", "user_id") REFERENCES "chat_members"("organization_id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_campaigns" ADD CONSTRAINT "sms_campaigns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sms_school_settings"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_recipients" ADD CONSTRAINT "sms_recipients_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "sms_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
