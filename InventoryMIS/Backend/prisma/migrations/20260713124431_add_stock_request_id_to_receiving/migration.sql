-- AlterTable
ALTER TABLE "stock_receivings" ADD COLUMN     "stock_request_id" TEXT;

-- CreateIndex
CREATE INDEX "stock_receivings_stock_request_id_idx" ON "stock_receivings"("stock_request_id");

-- AddForeignKey
ALTER TABLE "stock_receivings" ADD CONSTRAINT "stock_receivings_stock_request_id_fkey" FOREIGN KEY ("stock_request_id") REFERENCES "stock_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
