-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "EntityStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WalletStatus" AS ENUM ('ACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('SUCCESS', 'PENDING', 'FAILED');

-- CreateEnum
CREATE TYPE "CashoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "canteen_tenants" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "organization_code" TEXT,
    "organization_name" TEXT NOT NULL,
    "school_code" TEXT,
    "school_profile" JSONB,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "connected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canteen_tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canteen_profiles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT,
    "display_name" TEXT,
    "phone" TEXT,
    "role" TEXT NOT NULL,
    "supplier_id" TEXT,
    "driver_id" TEXT,
    "school_code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canteen_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canteen_student_wallets" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "student_code" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "class_name" TEXT,
    "card_code" TEXT NOT NULL,
    "rfid_uid" TEXT,
    "photo_url" TEXT,
    "balance_rwf" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "WalletStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canteen_student_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canteen_wallet_transactions" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'SUCCESS',
    "amount" DECIMAL(12,2) NOT NULL,
    "balance_after" DECIMAL(12,2) NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "canteen_wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canteen_suppliers" (
    "id" TEXT NOT NULL,
    "supplier_code" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "business_name" TEXT,
    "category" TEXT,
    "tin_number" TEXT,
    "contact_person" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "province" TEXT,
    "district" TEXT,
    "logo_url" TEXT,
    "status" "EntityStatus" NOT NULL DEFAULT 'PENDING',
    "approved_at" TIMESTAMP(3),
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canteen_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canteen_supplier_staff" (
    "id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "full_name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'staff',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canteen_supplier_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canteen_supplier_products" (
    "id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "unit" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canteen_supplier_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canteen_menu_items" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canteen_menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canteen_sales" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "sale_number" TEXT,
    "wallet_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "student_code" TEXT,
    "class_name" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "items" JSONB,
    "operator_id" TEXT,
    "operator_name" TEXT,
    "school_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "canteen_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canteen_inventory_items" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unit" TEXT DEFAULT 'pcs',
    "reorder_level" DECIMAL(12,2) DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "canteen_inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canteen_purchase_orders" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "supplier_name" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "items" JSONB,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_by_name" TEXT,
    "delivery_id" TEXT,
    "delivery_status" "DeliveryStatus",
    "school_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canteen_purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canteen_drivers" (
    "id" TEXT NOT NULL,
    "driver_code" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "vehicle_type" TEXT,
    "plate_number" TEXT,
    "id_number" TEXT,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "current_location" JSONB,
    "current_delivery_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canteen_drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canteen_deliveries" (
    "id" TEXT NOT NULL,
    "delivery_code" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "orderIds" JSONB,
    "destination" TEXT,
    "destination_school_code" TEXT,
    "estimated_arrival" TIMESTAMP(3),
    "status" "DeliveryStatus" NOT NULL DEFAULT 'ASSIGNED',
    "current_location" JSONB,
    "notes" TEXT,
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canteen_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canteen_cashout_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "canteen_id" TEXT,
    "school_code" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" TEXT NOT NULL,
    "status" "CashoutStatus" NOT NULL DEFAULT 'PENDING',
    "operator_id" TEXT,
    "operator_name" TEXT,
    "processed_by_id" TEXT,
    "processed_at" TIMESTAMP(3),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canteen_cashout_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canteen_onboarding_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "entity_type" TEXT NOT NULL,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "supplier_id" TEXT,
    "school_code" TEXT,
    "is_live" BOOLEAN NOT NULL DEFAULT false,
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canteen_onboarding_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canteen_notifications" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "canteen_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canteen_settings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canteen_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canteen_activity_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "canteen_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canteen_image_assets" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "reference_type" TEXT NOT NULL,
    "reference_id" TEXT,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "uploaded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "canteen_image_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "canteen_tenants_organization_id_key" ON "canteen_tenants"("organization_id");

-- CreateIndex
CREATE INDEX "canteen_profiles_user_id_idx" ON "canteen_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "canteen_profiles_organization_id_user_id_key" ON "canteen_profiles"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "canteen_student_wallets_card_code_key" ON "canteen_student_wallets"("card_code");

-- CreateIndex
CREATE INDEX "canteen_student_wallets_organization_id_idx" ON "canteen_student_wallets"("organization_id");

-- CreateIndex
CREATE INDEX "canteen_student_wallets_card_code_idx" ON "canteen_student_wallets"("card_code");

-- CreateIndex
CREATE INDEX "canteen_student_wallets_student_code_idx" ON "canteen_student_wallets"("student_code");

-- CreateIndex
CREATE UNIQUE INDEX "canteen_student_wallets_organization_id_student_id_key" ON "canteen_student_wallets"("organization_id", "student_id");

-- CreateIndex
CREATE INDEX "canteen_wallet_transactions_wallet_id_idx" ON "canteen_wallet_transactions"("wallet_id");

-- CreateIndex
CREATE INDEX "canteen_wallet_transactions_organization_id_idx" ON "canteen_wallet_transactions"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "canteen_suppliers_supplier_code_key" ON "canteen_suppliers"("supplier_code");

-- CreateIndex
CREATE INDEX "canteen_suppliers_status_idx" ON "canteen_suppliers"("status");

-- CreateIndex
CREATE INDEX "canteen_supplier_staff_user_id_idx" ON "canteen_supplier_staff"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "canteen_supplier_staff_supplier_id_user_id_key" ON "canteen_supplier_staff"("supplier_id", "user_id");

-- CreateIndex
CREATE INDEX "canteen_supplier_products_supplier_id_idx" ON "canteen_supplier_products"("supplier_id");

-- CreateIndex
CREATE INDEX "canteen_menu_items_organization_id_idx" ON "canteen_menu_items"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "canteen_menu_items_organization_id_name_key" ON "canteen_menu_items"("organization_id", "name");

-- CreateIndex
CREATE INDEX "canteen_sales_organization_id_idx" ON "canteen_sales"("organization_id");

-- CreateIndex
CREATE INDEX "canteen_sales_wallet_id_idx" ON "canteen_sales"("wallet_id");

-- CreateIndex
CREATE INDEX "canteen_sales_student_id_idx" ON "canteen_sales"("student_id");

-- CreateIndex
CREATE INDEX "canteen_inventory_items_organization_id_idx" ON "canteen_inventory_items"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "canteen_inventory_items_organization_id_name_key" ON "canteen_inventory_items"("organization_id", "name");

-- CreateIndex
CREATE INDEX "canteen_purchase_orders_organization_id_idx" ON "canteen_purchase_orders"("organization_id");

-- CreateIndex
CREATE INDEX "canteen_purchase_orders_supplier_id_idx" ON "canteen_purchase_orders"("supplier_id");

-- CreateIndex
CREATE INDEX "canteen_purchase_orders_status_idx" ON "canteen_purchase_orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "canteen_purchase_orders_organization_id_order_number_key" ON "canteen_purchase_orders"("organization_id", "order_number");

-- CreateIndex
CREATE UNIQUE INDEX "canteen_drivers_driver_code_key" ON "canteen_drivers"("driver_code");

-- CreateIndex
CREATE INDEX "canteen_drivers_supplier_id_idx" ON "canteen_drivers"("supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "canteen_deliveries_delivery_code_key" ON "canteen_deliveries"("delivery_code");

-- CreateIndex
CREATE INDEX "canteen_deliveries_driver_id_idx" ON "canteen_deliveries"("driver_id");

-- CreateIndex
CREATE INDEX "canteen_deliveries_supplier_id_idx" ON "canteen_deliveries"("supplier_id");

-- CreateIndex
CREATE INDEX "canteen_deliveries_status_idx" ON "canteen_deliveries"("status");

-- CreateIndex
CREATE INDEX "canteen_cashout_requests_organization_id_idx" ON "canteen_cashout_requests"("organization_id");

-- CreateIndex
CREATE INDEX "canteen_cashout_requests_status_idx" ON "canteen_cashout_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "canteen_onboarding_requests_supplier_id_key" ON "canteen_onboarding_requests"("supplier_id");

-- CreateIndex
CREATE INDEX "canteen_onboarding_requests_organization_id_idx" ON "canteen_onboarding_requests"("organization_id");

-- CreateIndex
CREATE INDEX "canteen_onboarding_requests_entity_type_idx" ON "canteen_onboarding_requests"("entity_type");

-- CreateIndex
CREATE INDEX "canteen_onboarding_requests_status_idx" ON "canteen_onboarding_requests"("status");

-- CreateIndex
CREATE INDEX "canteen_notifications_organization_id_idx" ON "canteen_notifications"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "canteen_settings_organization_id_key_key" ON "canteen_settings"("organization_id", "key");

-- CreateIndex
CREATE INDEX "canteen_activity_logs_organization_id_idx" ON "canteen_activity_logs"("organization_id");

-- CreateIndex
CREATE INDEX "canteen_image_assets_organization_id_idx" ON "canteen_image_assets"("organization_id");

-- AddForeignKey
ALTER TABLE "canteen_student_wallets" ADD CONSTRAINT "canteen_student_wallets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "canteen_tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canteen_wallet_transactions" ADD CONSTRAINT "canteen_wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "canteen_student_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canteen_supplier_staff" ADD CONSTRAINT "canteen_supplier_staff_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "canteen_suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canteen_supplier_products" ADD CONSTRAINT "canteen_supplier_products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "canteen_suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canteen_menu_items" ADD CONSTRAINT "canteen_menu_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "canteen_tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canteen_sales" ADD CONSTRAINT "canteen_sales_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "canteen_student_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canteen_sales" ADD CONSTRAINT "canteen_sales_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "canteen_tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canteen_inventory_items" ADD CONSTRAINT "canteen_inventory_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "canteen_tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canteen_purchase_orders" ADD CONSTRAINT "canteen_purchase_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "canteen_tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canteen_purchase_orders" ADD CONSTRAINT "canteen_purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "canteen_suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canteen_purchase_orders" ADD CONSTRAINT "canteen_purchase_orders_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "canteen_deliveries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canteen_drivers" ADD CONSTRAINT "canteen_drivers_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "canteen_suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canteen_deliveries" ADD CONSTRAINT "canteen_deliveries_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "canteen_drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canteen_deliveries" ADD CONSTRAINT "canteen_deliveries_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "canteen_suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canteen_cashout_requests" ADD CONSTRAINT "canteen_cashout_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "canteen_tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canteen_onboarding_requests" ADD CONSTRAINT "canteen_onboarding_requests_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "canteen_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canteen_notifications" ADD CONSTRAINT "canteen_notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "canteen_tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canteen_settings" ADD CONSTRAINT "canteen_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "canteen_tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canteen_activity_logs" ADD CONSTRAINT "canteen_activity_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "canteen_tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
