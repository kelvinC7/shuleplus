-- Core ShuleChat schema (tenants, conversations, messages). SMS tables are in 20261021120000_sms_center.

CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "ConversationType" AS ENUM ('DIRECT', 'GROUP', 'DEPARTMENT', 'ANNOUNCEMENT');
CREATE TYPE "MemberRole" AS ENUM ('ADMIN', 'MEMBER');
CREATE TYPE "ChatMemberKind" AS ENUM ('STAFF', 'PARENT');
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE');

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

CREATE UNIQUE INDEX "tenants_organization_id_key" ON "tenants"("organization_id");
CREATE INDEX "chat_members_organization_id_department_idx" ON "chat_members"("organization_id", "department");
CREATE INDEX "chat_members_organization_id_kind_idx" ON "chat_members"("organization_id", "kind");
CREATE INDEX "chat_members_organization_id_source_idx" ON "chat_members"("organization_id", "source");
CREATE UNIQUE INDEX "chat_members_organization_id_user_id_key" ON "chat_members"("organization_id", "user_id");
CREATE INDEX "conversations_organization_id_type_idx" ON "conversations"("organization_id", "type");
CREATE INDEX "conversations_organization_id_department_idx" ON "conversations"("organization_id", "department");
CREATE INDEX "conversations_organization_id_last_message_at_idx" ON "conversations"("organization_id", "last_message_at");
CREATE INDEX "conversation_members_user_id_idx" ON "conversation_members"("user_id");
CREATE INDEX "conversation_members_conversation_id_idx" ON "conversation_members"("conversation_id");
CREATE UNIQUE INDEX "conversation_members_conversation_id_user_id_key" ON "conversation_members"("conversation_id", "user_id");
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");
CREATE INDEX "messages_conversation_id_id_idx" ON "messages"("conversation_id", "id");
CREATE INDEX "messages_organization_id_idx" ON "messages"("organization_id");

ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_organization_id_user_id_fkey" FOREIGN KEY ("organization_id", "user_id") REFERENCES "chat_members"("organization_id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
