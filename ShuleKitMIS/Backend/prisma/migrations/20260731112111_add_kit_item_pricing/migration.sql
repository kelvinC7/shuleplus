-- AlterTable
ALTER TABLE "kit_requirements" ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "unit_price" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "kit_request_items" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "requirement_id" TEXT,
    "title" TEXT NOT NULL,
    "unit_price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "line_total" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kit_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kit_request_items_request_id_idx" ON "kit_request_items"("request_id");

-- CreateIndex
CREATE INDEX "kit_request_items_requirement_id_idx" ON "kit_request_items"("requirement_id");

-- AddForeignKey
ALTER TABLE "kit_request_items" ADD CONSTRAINT "kit_request_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "kit_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kit_request_items" ADD CONSTRAINT "kit_request_items_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "kit_requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
