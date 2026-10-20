/*
  Warnings:

  - You are about to drop the `records` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `reports` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "StoreType" AS ENUM ('MAIN', 'WAREHOUSE', 'BRANCH');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ISSUED');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED', 'ISSUED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'IN_TRANSIT', 'RECEIVED');

-- CreateEnum
CREATE TYPE "AdjustmentReason" AS ENUM ('DAMAGE', 'SPOILAGE', 'EXPIRED', 'COUNTING_ERROR', 'DONATION', 'LOSS');

-- DropForeignKey
ALTER TABLE "records" DROP CONSTRAINT "records_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_organization_id_fkey";

-- DropTable
DROP TABLE "records";

-- DropTable
DROP TABLE "reports";

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "category_id" TEXT NOT NULL,
    "brand" TEXT,
    "unit_of_measure" TEXT NOT NULL,
    "image_url" TEXT,
    "description" TEXT,
    "cost_price" DECIMAL(12,2),
    "selling_price" DECIMAL(12,2),
    "reorder_level" DECIMAL(12,2),
    "minimum_stock" DECIMAL(12,2),
    "maximum_stock" DECIMAL(12,2),
    "supplier_id" TEXT,
    "storage_location" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "StoreType" NOT NULL DEFAULT 'BRANCH',
    "location" TEXT,
    "manager_name" TEXT,
    "manager_contact" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_shelves" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_shelves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_person" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "tax_id" TEXT,
    "payment_terms" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_batches" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "store_id" TEXT,
    "batch_number" TEXT,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(12,2),
    "manufacturing_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "received_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_receivings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "grn_number" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "supplier_id" TEXT,
    "invoice_number" TEXT,
    "delivery_note_number" TEXT,
    "received_by" TEXT NOT NULL,
    "notes" TEXT,
    "received_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_receivings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_receiving_items" (
    "id" TEXT NOT NULL,
    "receiving_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "batch_number" TEXT,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unit_cost" DECIMAL(12,2),
    "expiry_date" TIMESTAMP(3),
    "manufacturing_date" TIMESTAMP(3),

    CONSTRAINT "stock_receiving_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_issues" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "issue_number" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "issued_to" TEXT NOT NULL,
    "issued_to_type" TEXT NOT NULL,
    "issued_to_name" TEXT NOT NULL,
    "purpose" TEXT,
    "requested_by" TEXT,
    "approved_by" TEXT,
    "issued_by" TEXT,
    "status" "IssueStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "issued_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_issue_items" (
    "id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "batch_id" TEXT,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unit_cost" DECIMAL(12,2),

    CONSTRAINT "stock_issue_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "transfer_number" TEXT NOT NULL,
    "from_store_id" TEXT NOT NULL,
    "to_store_id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "received_by" TEXT,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "transferred_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfer_items" (
    "id" TEXT NOT NULL,
    "transfer_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "batch_id" TEXT,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unit_cost" DECIMAL(12,2),

    CONSTRAINT "stock_transfer_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_adjustments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "adjustment_number" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "reason" "AdjustmentReason" NOT NULL,
    "reason_description" TEXT,
    "adjusted_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "notes" TEXT,
    "adjustment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_adjustment_items" (
    "id" TEXT NOT NULL,
    "adjustment_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "batch_id" TEXT,
    "expected_qty" DECIMAL(12,2) NOT NULL,
    "actual_qty" DECIMAL(12,2) NOT NULL,
    "difference" DECIMAL(12,2) NOT NULL,
    "unit_cost" DECIMAL(12,2),

    CONSTRAINT "stock_adjustment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "request_number" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "department_name" TEXT NOT NULL,
    "purpose" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by" TEXT,
    "issued_as_issue_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_request_items" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity_requested" DECIMAL(12,2) NOT NULL,
    "quantity_approved" DECIMAL(12,2),
    "quantity_issued" DECIMAL(12,2),
    "notes" TEXT,

    CONSTRAINT "stock_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "physical_stock_counts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "count_number" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "count_type" TEXT NOT NULL,
    "counted_by" TEXT NOT NULL,
    "verified_by" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "notes" TEXT,
    "count_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "physical_stock_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "physical_stock_count_items" (
    "id" TEXT NOT NULL,
    "count_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "system_qty" DECIMAL(12,2) NOT NULL,
    "actual_qty" DECIMAL(12,2) NOT NULL,
    "variance" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "physical_stock_count_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disposals" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "disposal_number" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "disposed_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "reason" TEXT NOT NULL,
    "disposal_method" TEXT,
    "notes" TEXT,
    "disposal_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disposal_items" (
    "id" TEXT NOT NULL,
    "disposal_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "batch_id" TEXT,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unit_cost" DECIMAL(12,2),

    CONSTRAINT "disposal_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "reference_type" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT,
    "file_size" INTEGER,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_categories_organization_id_idx" ON "product_categories"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_organization_id_name_key" ON "product_categories"("organization_id", "name");

-- CreateIndex
CREATE INDEX "products_organization_id_idx" ON "products"("organization_id");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_organization_id_sku_key" ON "products"("organization_id", "sku");

-- CreateIndex
CREATE INDEX "stores_organization_id_idx" ON "stores"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "stores_organization_id_code_key" ON "stores"("organization_id", "code");

-- CreateIndex
CREATE INDEX "store_shelves_organization_id_idx" ON "store_shelves"("organization_id");

-- CreateIndex
CREATE INDEX "store_shelves_store_id_idx" ON "store_shelves"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_shelves_store_id_code_key" ON "store_shelves"("store_id", "code");

-- CreateIndex
CREATE INDEX "suppliers_organization_id_idx" ON "suppliers"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_organization_id_name_key" ON "suppliers"("organization_id", "name");

-- CreateIndex
CREATE INDEX "inventory_batches_organization_id_idx" ON "inventory_batches"("organization_id");

-- CreateIndex
CREATE INDEX "inventory_batches_product_id_idx" ON "inventory_batches"("product_id");

-- CreateIndex
CREATE INDEX "inventory_batches_store_id_idx" ON "inventory_batches"("store_id");

-- CreateIndex
CREATE INDEX "inventory_batches_expiry_date_idx" ON "inventory_batches"("expiry_date");

-- CreateIndex
CREATE INDEX "stock_receivings_organization_id_idx" ON "stock_receivings"("organization_id");

-- CreateIndex
CREATE INDEX "stock_receivings_store_id_idx" ON "stock_receivings"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_receivings_organization_id_grn_number_key" ON "stock_receivings"("organization_id", "grn_number");

-- CreateIndex
CREATE INDEX "stock_receiving_items_receiving_id_idx" ON "stock_receiving_items"("receiving_id");

-- CreateIndex
CREATE INDEX "stock_receiving_items_product_id_idx" ON "stock_receiving_items"("product_id");

-- CreateIndex
CREATE INDEX "stock_issues_organization_id_idx" ON "stock_issues"("organization_id");

-- CreateIndex
CREATE INDEX "stock_issues_store_id_idx" ON "stock_issues"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_issues_organization_id_issue_number_key" ON "stock_issues"("organization_id", "issue_number");

-- CreateIndex
CREATE INDEX "stock_issue_items_issue_id_idx" ON "stock_issue_items"("issue_id");

-- CreateIndex
CREATE INDEX "stock_issue_items_product_id_idx" ON "stock_issue_items"("product_id");

-- CreateIndex
CREATE INDEX "stock_transfers_organization_id_idx" ON "stock_transfers"("organization_id");

-- CreateIndex
CREATE INDEX "stock_transfers_from_store_id_idx" ON "stock_transfers"("from_store_id");

-- CreateIndex
CREATE INDEX "stock_transfers_to_store_id_idx" ON "stock_transfers"("to_store_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_transfers_organization_id_transfer_number_key" ON "stock_transfers"("organization_id", "transfer_number");

-- CreateIndex
CREATE INDEX "stock_transfer_items_transfer_id_idx" ON "stock_transfer_items"("transfer_id");

-- CreateIndex
CREATE INDEX "stock_transfer_items_product_id_idx" ON "stock_transfer_items"("product_id");

-- CreateIndex
CREATE INDEX "stock_adjustments_organization_id_idx" ON "stock_adjustments"("organization_id");

-- CreateIndex
CREATE INDEX "stock_adjustments_store_id_idx" ON "stock_adjustments"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_adjustments_organization_id_adjustment_number_key" ON "stock_adjustments"("organization_id", "adjustment_number");

-- CreateIndex
CREATE INDEX "stock_adjustment_items_adjustment_id_idx" ON "stock_adjustment_items"("adjustment_id");

-- CreateIndex
CREATE INDEX "stock_adjustment_items_product_id_idx" ON "stock_adjustment_items"("product_id");

-- CreateIndex
CREATE INDEX "stock_requests_organization_id_idx" ON "stock_requests"("organization_id");

-- CreateIndex
CREATE INDEX "stock_requests_store_id_idx" ON "stock_requests"("store_id");

-- CreateIndex
CREATE INDEX "stock_requests_status_idx" ON "stock_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "stock_requests_organization_id_request_number_key" ON "stock_requests"("organization_id", "request_number");

-- CreateIndex
CREATE INDEX "stock_request_items_request_id_idx" ON "stock_request_items"("request_id");

-- CreateIndex
CREATE INDEX "stock_request_items_product_id_idx" ON "stock_request_items"("product_id");

-- CreateIndex
CREATE INDEX "physical_stock_counts_organization_id_idx" ON "physical_stock_counts"("organization_id");

-- CreateIndex
CREATE INDEX "physical_stock_counts_store_id_idx" ON "physical_stock_counts"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "physical_stock_counts_organization_id_count_number_key" ON "physical_stock_counts"("organization_id", "count_number");

-- CreateIndex
CREATE INDEX "physical_stock_count_items_count_id_idx" ON "physical_stock_count_items"("count_id");

-- CreateIndex
CREATE INDEX "physical_stock_count_items_product_id_idx" ON "physical_stock_count_items"("product_id");

-- CreateIndex
CREATE INDEX "disposals_organization_id_idx" ON "disposals"("organization_id");

-- CreateIndex
CREATE INDEX "disposals_store_id_idx" ON "disposals"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "disposals_organization_id_disposal_number_key" ON "disposals"("organization_id", "disposal_number");

-- CreateIndex
CREATE INDEX "disposal_items_disposal_id_idx" ON "disposal_items"("disposal_id");

-- CreateIndex
CREATE INDEX "disposal_items_product_id_idx" ON "disposal_items"("product_id");

-- CreateIndex
CREATE INDEX "attachments_organization_id_idx" ON "attachments"("organization_id");

-- CreateIndex
CREATE INDEX "attachments_reference_type_reference_id_idx" ON "attachments"("reference_type", "reference_id");

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_shelves" ADD CONSTRAINT "store_shelves_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_shelves" ADD CONSTRAINT "store_shelves_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_receivings" ADD CONSTRAINT "stock_receivings_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_receivings" ADD CONSTRAINT "stock_receivings_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_receivings" ADD CONSTRAINT "stock_receivings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_receiving_items" ADD CONSTRAINT "stock_receiving_items_receiving_id_fkey" FOREIGN KEY ("receiving_id") REFERENCES "stock_receivings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_receiving_items" ADD CONSTRAINT "stock_receiving_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_issues" ADD CONSTRAINT "stock_issues_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_issues" ADD CONSTRAINT "stock_issues_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_issue_items" ADD CONSTRAINT "stock_issue_items_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "stock_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_issue_items" ADD CONSTRAINT "stock_issue_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_issue_items" ADD CONSTRAINT "stock_issue_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "inventory_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_from_store_id_fkey" FOREIGN KEY ("from_store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_to_store_id_fkey" FOREIGN KEY ("to_store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "stock_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "inventory_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustment_items" ADD CONSTRAINT "stock_adjustment_items_adjustment_id_fkey" FOREIGN KEY ("adjustment_id") REFERENCES "stock_adjustments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustment_items" ADD CONSTRAINT "stock_adjustment_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustment_items" ADD CONSTRAINT "stock_adjustment_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "inventory_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_requests" ADD CONSTRAINT "stock_requests_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_requests" ADD CONSTRAINT "stock_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_request_items" ADD CONSTRAINT "stock_request_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "stock_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_request_items" ADD CONSTRAINT "stock_request_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_stock_counts" ADD CONSTRAINT "physical_stock_counts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_stock_counts" ADD CONSTRAINT "physical_stock_counts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_stock_count_items" ADD CONSTRAINT "physical_stock_count_items_count_id_fkey" FOREIGN KEY ("count_id") REFERENCES "physical_stock_counts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_stock_count_items" ADD CONSTRAINT "physical_stock_count_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disposals" ADD CONSTRAINT "disposals_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disposals" ADD CONSTRAINT "disposals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disposal_items" ADD CONSTRAINT "disposal_items_disposal_id_fkey" FOREIGN KEY ("disposal_id") REFERENCES "disposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disposal_items" ADD CONSTRAINT "disposal_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disposal_items" ADD CONSTRAINT "disposal_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "inventory_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
