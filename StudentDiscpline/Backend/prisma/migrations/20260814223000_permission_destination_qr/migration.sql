-- AlterTable
ALTER TABLE "permission_requests" ADD COLUMN "destination" TEXT NOT NULL DEFAULT '';
ALTER TABLE "permission_requests" ADD COLUMN "destination_address" TEXT;
ALTER TABLE "permission_requests" ADD COLUMN "scan_code" TEXT;

UPDATE "permission_requests"
SET "scan_code" = 'PRC-' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 8))
WHERE "scan_code" IS NULL;

UPDATE "permission_requests"
SET "destination" = COALESCE(NULLIF("reason", ''), 'Not specified')
WHERE "destination" = '';

ALTER TABLE "permission_requests" ALTER COLUMN "scan_code" SET NOT NULL;

CREATE UNIQUE INDEX "permission_requests_scan_code_key" ON "permission_requests"("scan_code");
