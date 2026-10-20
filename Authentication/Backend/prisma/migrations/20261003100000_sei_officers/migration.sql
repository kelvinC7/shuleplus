-- SEI officers + MFA session step for dual OTP

ALTER TABLE "mfa_sessions" ADD COLUMN IF NOT EXISTS "verification_step" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "sei_officer_profiles" (
    "user_id" TEXT NOT NULL,
    "province_id" TEXT,
    "province_name" TEXT,
    "district_id" TEXT,
    "district_name" TEXT,
    "sector_id" TEXT,
    "sector_name" TEXT NOT NULL,
    "enforce_mfa" BOOLEAN NOT NULL DEFAULT true,
    "require_dual_otp" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sei_officer_profiles_pkey" PRIMARY KEY ("user_id")
);

DO $$ BEGIN
  ALTER TABLE "sei_officer_profiles"
    ADD CONSTRAINT "sei_officer_profiles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
