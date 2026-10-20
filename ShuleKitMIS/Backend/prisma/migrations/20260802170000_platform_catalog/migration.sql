-- Platform catalog + order lifecycle expansion

CREATE TYPE "CatalogStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED');
CREATE TYPE "OrderType" AS ENUM ('STANDARD', 'CUSTOM', 'LEGACY');
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED');

ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'CONFIRMED';
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'PACKED';
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'SHIPPED';
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'OUT_FOR_DELIVERY';
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';

CREATE TABLE IF NOT EXISTS "product_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "CatalogStatus" NOT NULL DEFAULT 'ACTIVE',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_categories_slug_key" ON "product_categories"("slug");

CREATE TABLE IF NOT EXISTS "products" (
    "id" TEXT NOT NULL,
    "category_id" TEXT,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "unit_price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "stock_qty" INTEGER NOT NULL DEFAULT 0,
    "vat_percent" DECIMAL(65,30),
    "status" "CatalogStatus" NOT NULL DEFAULT 'ACTIVE',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "custom_eligible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "products_sku_key" ON "products"("sku");
CREATE INDEX IF NOT EXISTS "products_category_id_idx" ON "products"("category_id");
CREATE INDEX IF NOT EXISTS "products_status_idx" ON "products"("status");

CREATE TABLE IF NOT EXISTS "standard_kits" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "organization_name" TEXT,
    "district" TEXT,
    "academic_year" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "class_name" TEXT NOT NULL,
    "education_level" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "babyeyi_circular_id" TEXT,
    "total_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" "CatalogStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "standard_kits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "standard_kits_babyeyi_circular_id_key" ON "standard_kits"("babyeyi_circular_id");
CREATE INDEX IF NOT EXISTS "standard_kits_organization_id_academic_year_term_class_name_idx" ON "standard_kits"("organization_id", "academic_year", "term", "class_name");
CREATE INDEX IF NOT EXISTS "standard_kits_district_idx" ON "standard_kits"("district");
CREATE INDEX IF NOT EXISTS "standard_kits_status_idx" ON "standard_kits"("status");

CREATE TABLE IF NOT EXISTS "standard_kit_items" (
    "id" TEXT NOT NULL,
    "standard_kit_id" TEXT NOT NULL,
    "product_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "image_url" TEXT,
    "source_item_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "standard_kit_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "standard_kit_items_standard_kit_id_idx" ON "standard_kit_items"("standard_kit_id");

CREATE TABLE IF NOT EXISTS "pricing_rules" (
    "id" TEXT NOT NULL,
    "product_id" TEXT,
    "standard_kit_id" TEXT,
    "selling_price" DECIMAL(65,30) NOT NULL,
    "discount_pct" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "promotion_label" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "pricing_rules_product_id_idx" ON "pricing_rules"("product_id");
CREATE INDEX IF NOT EXISTS "pricing_rules_standard_kit_id_idx" ON "pricing_rules"("standard_kit_id");

CREATE TABLE IF NOT EXISTS "deliveries" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "method" "DeliveryMethod" NOT NULL DEFAULT 'AT_HOME',
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "address_line" TEXT,
    "pickup_point" TEXT,
    "district" TEXT,
    "sector" TEXT,
    "fee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "tracking_code" TEXT,
    "courier_name" TEXT,
    "estimated_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "deliveries_request_id_key" ON "deliveries"("request_id");
CREATE INDEX IF NOT EXISTS "deliveries_status_idx" ON "deliveries"("status");
CREATE INDEX IF NOT EXISTS "deliveries_district_idx" ON "deliveries"("district");

CREATE TABLE IF NOT EXISTS "platform_settings" (
    "id" TEXT NOT NULL,
    "home_delivery_fee" DECIMAL(65,30) NOT NULL DEFAULT 2500,
    "school_pickup_fee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 10,
    "custom_kits_enabled" BOOLEAN NOT NULL DEFAULT true,
    "standard_kits_enabled" BOOLEAN NOT NULL DEFAULT true,
    "support_phone" TEXT,
    "support_email" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "kit_requests" ADD COLUMN IF NOT EXISTS "organization_name" TEXT;
ALTER TABLE "kit_requests" ADD COLUMN IF NOT EXISTS "district" TEXT;
ALTER TABLE "kit_requests" ADD COLUMN IF NOT EXISTS "academic_year" TEXT;
ALTER TABLE "kit_requests" ADD COLUMN IF NOT EXISTS "term" TEXT;
ALTER TABLE "kit_requests" ADD COLUMN IF NOT EXISTS "order_type" "OrderType" NOT NULL DEFAULT 'LEGACY';
ALTER TABLE "kit_requests" ADD COLUMN IF NOT EXISTS "standard_kit_id" TEXT;
ALTER TABLE "kit_requests" ADD COLUMN IF NOT EXISTS "tracking_number" TEXT;

ALTER TABLE "kit_requests" ALTER COLUMN "kit_id" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "kit_requests_tracking_number_key" ON "kit_requests"("tracking_number");
CREATE INDEX IF NOT EXISTS "kit_requests_order_type_status_idx" ON "kit_requests"("order_type", "status");
CREATE INDEX IF NOT EXISTS "kit_requests_district_idx" ON "kit_requests"("district");

ALTER TABLE "kit_request_items" ADD COLUMN IF NOT EXISTS "product_id" TEXT;
CREATE INDEX IF NOT EXISTS "kit_request_items_product_id_idx" ON "kit_request_items"("product_id");

DO $$ BEGIN
  ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "standard_kits" ADD CONSTRAINT "standard_kits_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "standard_kit_items" ADD CONSTRAINT "standard_kit_items_standard_kit_id_fkey" FOREIGN KEY ("standard_kit_id") REFERENCES "standard_kits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "standard_kit_items" ADD CONSTRAINT "standard_kit_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_standard_kit_id_fkey" FOREIGN KEY ("standard_kit_id") REFERENCES "standard_kits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "kit_requests" ADD CONSTRAINT "kit_requests_standard_kit_id_fkey" FOREIGN KEY ("standard_kit_id") REFERENCES "standard_kits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "kit_request_items" ADD CONSTRAINT "kit_request_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "kit_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
