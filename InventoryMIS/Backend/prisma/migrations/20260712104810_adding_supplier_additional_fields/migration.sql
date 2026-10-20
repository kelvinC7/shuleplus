/*
  Warnings:

  - You are about to drop the column `payment_terms` on the `suppliers` table. All the data in the column will be lost.
  - You are about to drop the column `tax_id` on the `suppliers` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "suppliers" DROP COLUMN "payment_terms",
DROP COLUMN "tax_id",
ADD COLUMN     "bank_account_number" TEXT,
ADD COLUMN     "bank_name" TEXT,
ADD COLUMN     "contract_url" TEXT,
ADD COLUMN     "mobile_money_number" TEXT,
ADD COLUMN     "payment_method" TEXT,
ADD COLUMN     "tin_number" TEXT;
