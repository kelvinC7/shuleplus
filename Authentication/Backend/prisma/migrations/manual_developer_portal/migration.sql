-- Developer Portal tables
-- Run: psql $DATABASE_URL -f prisma/migrations/manual_developer_portal/migration.sql

CREATE TYPE "DeveloperAccessType" AS ENUM ('DEVELOPER', 'TECHNICAL_ADMIN', 'API_VIEWER');
CREATE TYPE "DeveloperUserStatus" AS ENUM ('PENDING_ACTIVATION', 'ACTIVE', 'SUSPENDED', 'LOCKED');
CREATE TYPE "DeveloperEnvironment" AS ENUM ('SANDBOX', 'PRODUCTION');
CREATE TYPE "DeveloperApplicationStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');

CREATE TABLE "developer_partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "developer_partners_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "developer_partners_slug_key" ON "developer_partners"("slug");

CREATE TABLE "developer_users" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "access_type" "DeveloperAccessType" NOT NULL DEFAULT 'DEVELOPER',
    "status" "DeveloperUserStatus" NOT NULL DEFAULT 'PENDING_ACTIVATION',
    "allowed_modules" JSONB NOT NULL DEFAULT '{}',
    "allowed_environments" JSONB NOT NULL DEFAULT '["SANDBOX"]',
    "ip_restrictions" JSONB,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMP(3),
    "activated_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "last_login_ip" TEXT,
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "recovery_codes_hash" JSONB,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "developer_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "developer_users_email_key" ON "developer_users"("email");
CREATE INDEX "developer_users_partner_id_idx" ON "developer_users"("partner_id");

ALTER TABLE "developer_users" ADD CONSTRAINT "developer_users_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "developer_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "developer_activation_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "developer_activation_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "developer_activation_tokens_token_hash_key" ON "developer_activation_tokens"("token_hash");
CREATE INDEX "developer_activation_tokens_user_id_idx" ON "developer_activation_tokens"("user_id");

ALTER TABLE "developer_activation_tokens" ADD CONSTRAINT "developer_activation_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "developer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "developer_mfa_secrets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "developer_mfa_secrets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "developer_mfa_secrets_user_id_key" ON "developer_mfa_secrets"("user_id");

ALTER TABLE "developer_mfa_secrets" ADD CONSTRAINT "developer_mfa_secrets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "developer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "developer_mfa_sessions" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "remember_me" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "developer_mfa_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "developer_mfa_sessions_token_key" ON "developer_mfa_sessions"("token");
CREATE INDEX "developer_mfa_sessions_user_id_idx" ON "developer_mfa_sessions"("user_id");

CREATE TABLE "developer_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_name" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "ip_address" TEXT,
    "location" TEXT,
    "user_agent" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_trusted" BOOLEAN NOT NULL DEFAULT false,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "developer_sessions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "developer_sessions" ADD CONSTRAINT "developer_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "developer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "developer_refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "developer_refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "developer_refresh_tokens_token_hash_key" ON "developer_refresh_tokens"("token_hash");

ALTER TABLE "developer_refresh_tokens" ADD CONSTRAINT "developer_refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "developer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "developer_refresh_tokens" ADD CONSTRAINT "developer_refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "developer_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "developer_applications" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "environment" "DeveloperEnvironment" NOT NULL DEFAULT 'SANDBOX',
    "status" "DeveloperApplicationStatus" NOT NULL DEFAULT 'ACTIVE',
    "client_id" TEXT NOT NULL,
    "client_secret_hash" TEXT NOT NULL,
    "client_secret_prefix" TEXT NOT NULL,
    "scopes" JSONB NOT NULL DEFAULT '[]',
    "rate_limit_per_minute" INTEGER NOT NULL DEFAULT 1000,
    "rate_limit_per_day" INTEGER NOT NULL DEFAULT 100000,
    "last_used_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "developer_applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "developer_applications_client_id_key" ON "developer_applications"("client_id");
CREATE INDEX "developer_applications_partner_id_idx" ON "developer_applications"("partner_id");

ALTER TABLE "developer_applications" ADD CONSTRAINT "developer_applications_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "developer_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "developer_webhooks" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret_hash" TEXT NOT NULL,
    "events" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_delivery" TIMESTAMP(3),
    "success_rate" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "developer_webhooks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "developer_webhooks_application_id_idx" ON "developer_webhooks"("application_id");

ALTER TABLE "developer_webhooks" ADD CONSTRAINT "developer_webhooks_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "developer_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "developer_api_logs" (
    "id" TEXT NOT NULL,
    "application_id" TEXT,
    "partner_id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL,
    "response_time" INTEGER NOT NULL,
    "environment" "DeveloperEnvironment" NOT NULL DEFAULT 'SANDBOX',
    "ip_address" TEXT,
    "request_body" JSONB,
    "response_body" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "developer_api_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "developer_api_logs_request_id_key" ON "developer_api_logs"("request_id");
CREATE INDEX "developer_api_logs_partner_id_created_at_idx" ON "developer_api_logs"("partner_id", "created_at");
CREATE INDEX "developer_api_logs_application_id_created_at_idx" ON "developer_api_logs"("application_id", "created_at");

ALTER TABLE "developer_api_logs" ADD CONSTRAINT "developer_api_logs_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "developer_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "developer_audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "partner_id" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resource_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "developer_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "developer_audit_logs_partner_id_created_at_idx" ON "developer_audit_logs"("partner_id", "created_at");
CREATE INDEX "developer_audit_logs_user_id_created_at_idx" ON "developer_audit_logs"("user_id", "created_at");

ALTER TABLE "developer_audit_logs" ADD CONSTRAINT "developer_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "developer_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
