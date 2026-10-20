-- Parent portal authentication
ALTER TABLE "parents" ADD COLUMN IF NOT EXISTS "password_hash" TEXT;
