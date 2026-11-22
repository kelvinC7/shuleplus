-- CreateEnum
CREATE TYPE "SchoolRegistrationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ADDITIONAL_INFO_REQUIRED', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TripPortalAccountKind" AS ENUM ('SCHOOL', 'GOVERNMENT', 'SUPER_ADMIN');

-- CreateTable
CREATE TABLE "school_registrations" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "SchoolRegistrationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "school_code" TEXT NOT NULL,
    "official_name" TEXT NOT NULL,
    "account_email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "organization_id" TEXT,
    "review_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_portal_users" (
    "id" TEXT NOT NULL,
    "kind" "TripPortalAccountKind" NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "roles" JSONB NOT NULL DEFAULT '[]',
    "modules" JSONB NOT NULL DEFAULT '["shule-trip"]',
    "organization_id" TEXT,
    "organization_name" TEXT,
    "district" TEXT,
    "display_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_portal_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "school_registrations_reference_key" ON "school_registrations"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "school_registrations_school_code_key" ON "school_registrations"("school_code");

-- CreateIndex
CREATE UNIQUE INDEX "school_registrations_username_key" ON "school_registrations"("username");

-- CreateIndex
CREATE UNIQUE INDEX "school_registrations_organization_id_key" ON "school_registrations"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "trip_portal_users_username_key" ON "trip_portal_users"("username");
