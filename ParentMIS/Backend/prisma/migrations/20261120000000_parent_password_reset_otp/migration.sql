CREATE TABLE "parent_password_reset_otps" (
    "id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_sent_at" TIMESTAMP(3) NOT NULL,
    "verified_at" TIMESTAMP(3),
    "reset_token_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parent_password_reset_otps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "parent_password_reset_otps_parent_id_key" ON "parent_password_reset_otps"("parent_id");
CREATE INDEX "parent_password_reset_otps_expires_at_idx" ON "parent_password_reset_otps"("expires_at");

ALTER TABLE "parent_password_reset_otps"
ADD CONSTRAINT "parent_password_reset_otps_parent_id_fkey"
FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;