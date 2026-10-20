-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "signature_url" TEXT;
ALTER TABLE "organizations" ADD COLUMN "stamp_url" TEXT;

-- AlterTable
ALTER TABLE "school_profiles" ADD COLUMN "principal_name" TEXT;
ALTER TABLE "school_profiles" ADD COLUMN "deputy_head_name" TEXT;
ALTER TABLE "school_profiles" ADD COLUMN "bursar_name" TEXT;
ALTER TABLE "school_profiles" ADD COLUMN "secretary_name" TEXT;
ALTER TABLE "school_profiles" ADD COLUMN "leadership_phone" TEXT;
ALTER TABLE "school_profiles" ADD COLUMN "leadership_email" TEXT;
