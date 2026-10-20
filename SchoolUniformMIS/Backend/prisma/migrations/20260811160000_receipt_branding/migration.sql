ALTER TABLE "school_uniform_settings"
ADD COLUMN IF NOT EXISTS "receipt_signature_url" TEXT,
ADD COLUMN IF NOT EXISTS "receipt_stamp_url" TEXT;
