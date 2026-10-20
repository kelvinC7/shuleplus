-- CreateEnum
CREATE TYPE "SubscriptionPeriod" AS ENUM ('MONTHLY', 'YEARLY', 'LIFETIME', 'TRIAL', 'ENTERPRISE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "OrgSubscriptionStatus" AS ENUM ('ACTIVE', 'TRIAL', 'SUSPENDED', 'CANCELLED', 'EXPIRED');

-- AlterTable
ALTER TABLE "organization_modules" ADD COLUMN     "is_hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "limits" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "provision_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "provision_last_error" TEXT;

-- CreateTable
CREATE TABLE "module_provision_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "module_id" TEXT,
    "module_slug" TEXT,
    "action" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "message" TEXT,
    "actor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "module_provision_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "period" "SubscriptionPeriod" NOT NULL DEFAULT 'MONTHLY',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "description" TEXT,
    "features" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_subscriptions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "OrgSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3),
    "renewed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "module_provision_logs_organization_id_created_at_idx" ON "module_provision_logs"("organization_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");

-- CreateIndex
CREATE UNIQUE INDEX "organization_subscriptions_organization_id_key" ON "organization_subscriptions"("organization_id");

-- AddForeignKey
ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "organization_subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "organization_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
