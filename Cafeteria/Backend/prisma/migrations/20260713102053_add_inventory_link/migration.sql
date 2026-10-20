-- AlterTable
ALTER TABLE "cafeteria_kitchen_requests" ADD COLUMN     "inventory_status" TEXT,
ADD COLUMN     "stock_request_id" TEXT;

-- CreateIndex
CREATE INDEX "cafeteria_kitchen_requests_stock_request_id_idx" ON "cafeteria_kitchen_requests"("stock_request_id");
