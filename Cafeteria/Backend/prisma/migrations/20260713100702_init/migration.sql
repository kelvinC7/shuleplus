/*
  Warnings:

  - You are about to drop the `activity_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `records` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `reports` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tenants` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users_cache` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'MORNING_TEA', 'LUNCH', 'AFTERNOON_SNACK', 'DINNER');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'EVENT', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProductionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ISSUED', 'RECEIVED');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('CHEF', 'KITCHEN_ASSISTANT', 'STOREKEEPER', 'CLEANER', 'SUPERVISOR');

-- CreateEnum
CREATE TYPE "RosterStatus" AS ENUM ('SCHEDULED', 'ON_DUTY', 'COMPLETED', 'ABSENT');

-- CreateEnum
CREATE TYPE "HygieneCheckType" AS ENUM ('KITCHEN_CLEANING', 'EQUIPMENT_CLEANING', 'FOOD_TEMPERATURE', 'WATER_QUALITY', 'HEALTH_INSPECTION', 'SANITATION');

-- CreateEnum
CREATE TYPE "HygieneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'REJECTED');

-- CreateEnum
CREATE TYPE "QualityStatus" AS ENUM ('ACCEPTED', 'REJECTED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "WasteType" AS ENUM ('SPOILED', 'LEFTOVERS', 'EXPIRED', 'COOKING_WASTE', 'OVERPRODUCED');

-- CreateEnum
CREATE TYPE "SeverityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- DropForeignKey
ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "records" DROP CONSTRAINT "records_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "settings" DROP CONSTRAINT "settings_organization_id_fkey";

-- DropTable
DROP TABLE "activity_logs";

-- DropTable
DROP TABLE "records";

-- DropTable
DROP TABLE "reports";

-- DropTable
DROP TABLE "settings";

-- DropTable
DROP TABLE "tenants";

-- DropTable
DROP TABLE "users_cache";

-- CreateTable
CREATE TABLE "cafeteria_tenants" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "organization_code" TEXT,
    "organization_name" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cafeteria_tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafeteria_users_cache" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT,
    "display_name" TEXT,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cafeteria_users_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafeteria_menu_items" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "meal_type" "MealType" NOT NULL,
    "description" TEXT,
    "is_vegetarian" BOOLEAN NOT NULL DEFAULT false,
    "is_vegan" BOOLEAN NOT NULL DEFAULT false,
    "is_halal" BOOLEAN NOT NULL DEFAULT false,
    "is_gluten_free" BOOLEAN NOT NULL DEFAULT false,
    "image_url" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cafeteria_menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafeteria_recipes" (
    "id" TEXT NOT NULL,
    "menu_item_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "prep_time_minutes" INTEGER,
    "cook_time_minutes" INTEGER,
    "servings" INTEGER,
    "calories" INTEGER,
    "protein" INTEGER,
    "carbohydrates" INTEGER,
    "fat" INTEGER,
    "vitamins" TEXT,
    "allergens" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cafeteria_recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafeteria_recipe_ingredients" (
    "id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "cafeteria_recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafeteria_meal_plans" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "plan_date" TIMESTAMP(3) NOT NULL,
    "meal_type" "MealType" NOT NULL,
    "plan_type" "PlanType" NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cafeteria_meal_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafeteria_meal_plan_items" (
    "id" TEXT NOT NULL,
    "meal_plan_id" TEXT NOT NULL,
    "menu_item_id" TEXT NOT NULL,
    "servings_planned" INTEGER NOT NULL,

    CONSTRAINT "cafeteria_meal_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafeteria_meal_productions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "meal_plan_id" TEXT,
    "production_date" TIMESTAMP(3) NOT NULL,
    "meal_type" "MealType" NOT NULL,
    "planned_servings" INTEGER NOT NULL,
    "actual_servings" INTEGER NOT NULL DEFAULT 0,
    "status" "ProductionStatus" NOT NULL DEFAULT 'PLANNED',
    "prepared_by" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cafeteria_meal_productions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafeteria_meal_production_items" (
    "id" TEXT NOT NULL,
    "production_id" TEXT NOT NULL,
    "menu_item_id" TEXT NOT NULL,
    "recipe_id" TEXT,
    "planned_quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "actual_quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "cafeteria_meal_production_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafeteria_meal_servings" (
    "id" TEXT NOT NULL,
    "production_id" TEXT NOT NULL,
    "beneficiary_type" TEXT NOT NULL,
    "beneficiary_id" TEXT,
    "beneficiary_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "served_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "cafeteria_meal_servings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafeteria_food_waste" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "production_id" TEXT,
    "waste_date" TIMESTAMP(3) NOT NULL,
    "waste_type" "WasteType" NOT NULL,
    "item_name" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "cost" DECIMAL(10,2),
    "reason" TEXT,
    "reported_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cafeteria_food_waste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafeteria_kitchen_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "request_number" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "storekeeper_approval" TEXT,
    "approved_by" TEXT,
    "issued_by" TEXT,
    "received_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cafeteria_kitchen_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafeteria_kitchen_request_items" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity_requested" DECIMAL(10,2) NOT NULL,
    "quantity_approved" DECIMAL(10,2),
    "quantity_issued" DECIMAL(10,2),
    "notes" TEXT,

    CONSTRAINT "cafeteria_kitchen_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafeteria_kitchen_staff" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "qualification" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cafeteria_kitchen_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafeteria_duty_rosters" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "roster_date" TIMESTAMP(3) NOT NULL,
    "shift" TEXT NOT NULL,
    "duty" TEXT NOT NULL,
    "status" "RosterStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cafeteria_duty_rosters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafeteria_hygiene_checklists" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "check_date" TIMESTAMP(3) NOT NULL,
    "check_type" "HygieneCheckType" NOT NULL,
    "status" "HygieneStatus" NOT NULL DEFAULT 'PENDING',
    "checked_by" TEXT NOT NULL,
    "score" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cafeteria_hygiene_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafeteria_hygiene_checklist_items" (
    "id" TEXT NOT NULL,
    "checklist_id" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "cafeteria_hygiene_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafeteria_cold_storage_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "log_date" TIMESTAMP(3) NOT NULL,
    "freezer_temperature" DECIMAL(5,2) NOT NULL,
    "refrigerator_temperature" DECIMAL(5,2) NOT NULL,
    "storage_conditions" TEXT,
    "alerts_triggered" BOOLEAN NOT NULL DEFAULT false,
    "logged_by" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cafeteria_cold_storage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafeteria_supplier_deliveries" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "delivery_date" TIMESTAMP(3) NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'SCHEDULED',
    "qualityRating" INTEGER,
    "inspection_notes" TEXT,
    "received_by" TEXT NOT NULL,
    "invoice_number" TEXT,
    "delivery_note_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cafeteria_supplier_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafeteria_supplier_delivery_items" (
    "id" TEXT NOT NULL,
    "delivery_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_cost" DECIMAL(10,2),
    "quality_status" "QualityStatus" NOT NULL,
    "notes" TEXT,

    CONSTRAINT "cafeteria_supplier_delivery_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafeteria_nutrition_profiles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "meal_plan_id" TEXT NOT NULL,
    "calories" INTEGER,
    "protein" INTEGER,
    "carbohydrates" INTEGER,
    "fat" INTEGER,
    "vitamins" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cafeteria_nutrition_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafeteria_allergy_profiles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "beneficiary_type" TEXT NOT NULL,
    "beneficiary_id" TEXT,
    "beneficiary_name" TEXT NOT NULL,
    "allergy_type" TEXT NOT NULL,
    "severity" "SeverityLevel" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cafeteria_allergy_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafeteria_meal_budgets" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "allocated_amount" DECIMAL(12,2) NOT NULL,
    "spent_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cafeteria_meal_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafeteria_attachments" (
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

    CONSTRAINT "cafeteria_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafeteria_notifications" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cafeteria_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafeteria_settings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cafeteria_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafeteria_activity_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cafeteria_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cafeteria_tenants_organization_id_key" ON "cafeteria_tenants"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "cafeteria_users_cache_organization_id_user_id_key" ON "cafeteria_users_cache"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "cafeteria_menu_items_organization_id_idx" ON "cafeteria_menu_items"("organization_id");

-- CreateIndex
CREATE INDEX "cafeteria_menu_items_meal_type_idx" ON "cafeteria_menu_items"("meal_type");

-- CreateIndex
CREATE UNIQUE INDEX "cafeteria_menu_items_organization_id_name_key" ON "cafeteria_menu_items"("organization_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "cafeteria_recipes_menu_item_id_key" ON "cafeteria_recipes"("menu_item_id");

-- CreateIndex
CREATE INDEX "cafeteria_recipes_organization_id_idx" ON "cafeteria_recipes"("organization_id");

-- CreateIndex
CREATE INDEX "cafeteria_recipe_ingredients_recipe_id_idx" ON "cafeteria_recipe_ingredients"("recipe_id");

-- CreateIndex
CREATE INDEX "cafeteria_recipe_ingredients_product_id_idx" ON "cafeteria_recipe_ingredients"("product_id");

-- CreateIndex
CREATE INDEX "cafeteria_meal_plans_organization_id_idx" ON "cafeteria_meal_plans"("organization_id");

-- CreateIndex
CREATE INDEX "cafeteria_meal_plans_plan_date_idx" ON "cafeteria_meal_plans"("plan_date");

-- CreateIndex
CREATE INDEX "cafeteria_meal_plans_meal_type_idx" ON "cafeteria_meal_plans"("meal_type");

-- CreateIndex
CREATE INDEX "cafeteria_meal_plans_status_idx" ON "cafeteria_meal_plans"("status");

-- CreateIndex
CREATE INDEX "cafeteria_meal_plan_items_meal_plan_id_idx" ON "cafeteria_meal_plan_items"("meal_plan_id");

-- CreateIndex
CREATE INDEX "cafeteria_meal_productions_organization_id_idx" ON "cafeteria_meal_productions"("organization_id");

-- CreateIndex
CREATE INDEX "cafeteria_meal_productions_production_date_idx" ON "cafeteria_meal_productions"("production_date");

-- CreateIndex
CREATE INDEX "cafeteria_meal_productions_meal_type_idx" ON "cafeteria_meal_productions"("meal_type");

-- CreateIndex
CREATE INDEX "cafeteria_meal_productions_status_idx" ON "cafeteria_meal_productions"("status");

-- CreateIndex
CREATE INDEX "cafeteria_meal_production_items_production_id_idx" ON "cafeteria_meal_production_items"("production_id");

-- CreateIndex
CREATE INDEX "cafeteria_meal_servings_production_id_idx" ON "cafeteria_meal_servings"("production_id");

-- CreateIndex
CREATE INDEX "cafeteria_meal_servings_beneficiary_type_idx" ON "cafeteria_meal_servings"("beneficiary_type");

-- CreateIndex
CREATE INDEX "cafeteria_food_waste_organization_id_idx" ON "cafeteria_food_waste"("organization_id");

-- CreateIndex
CREATE INDEX "cafeteria_food_waste_waste_date_idx" ON "cafeteria_food_waste"("waste_date");

-- CreateIndex
CREATE INDEX "cafeteria_food_waste_waste_type_idx" ON "cafeteria_food_waste"("waste_type");

-- CreateIndex
CREATE INDEX "cafeteria_kitchen_requests_organization_id_idx" ON "cafeteria_kitchen_requests"("organization_id");

-- CreateIndex
CREATE INDEX "cafeteria_kitchen_requests_status_idx" ON "cafeteria_kitchen_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "cafeteria_kitchen_requests_organization_id_request_number_key" ON "cafeteria_kitchen_requests"("organization_id", "request_number");

-- CreateIndex
CREATE INDEX "cafeteria_kitchen_request_items_request_id_idx" ON "cafeteria_kitchen_request_items"("request_id");

-- CreateIndex
CREATE INDEX "cafeteria_kitchen_request_items_product_id_idx" ON "cafeteria_kitchen_request_items"("product_id");

-- CreateIndex
CREATE INDEX "cafeteria_kitchen_staff_organization_id_idx" ON "cafeteria_kitchen_staff"("organization_id");

-- CreateIndex
CREATE INDEX "cafeteria_duty_rosters_organization_id_idx" ON "cafeteria_duty_rosters"("organization_id");

-- CreateIndex
CREATE INDEX "cafeteria_duty_rosters_roster_date_idx" ON "cafeteria_duty_rosters"("roster_date");

-- CreateIndex
CREATE INDEX "cafeteria_duty_rosters_staff_id_idx" ON "cafeteria_duty_rosters"("staff_id");

-- CreateIndex
CREATE INDEX "cafeteria_hygiene_checklists_organization_id_idx" ON "cafeteria_hygiene_checklists"("organization_id");

-- CreateIndex
CREATE INDEX "cafeteria_hygiene_checklists_check_date_idx" ON "cafeteria_hygiene_checklists"("check_date");

-- CreateIndex
CREATE INDEX "cafeteria_hygiene_checklist_items_checklist_id_idx" ON "cafeteria_hygiene_checklist_items"("checklist_id");

-- CreateIndex
CREATE INDEX "cafeteria_cold_storage_logs_organization_id_idx" ON "cafeteria_cold_storage_logs"("organization_id");

-- CreateIndex
CREATE INDEX "cafeteria_cold_storage_logs_log_date_idx" ON "cafeteria_cold_storage_logs"("log_date");

-- CreateIndex
CREATE INDEX "cafeteria_supplier_deliveries_organization_id_idx" ON "cafeteria_supplier_deliveries"("organization_id");

-- CreateIndex
CREATE INDEX "cafeteria_supplier_deliveries_supplier_id_idx" ON "cafeteria_supplier_deliveries"("supplier_id");

-- CreateIndex
CREATE INDEX "cafeteria_supplier_deliveries_delivery_date_idx" ON "cafeteria_supplier_deliveries"("delivery_date");

-- CreateIndex
CREATE INDEX "cafeteria_supplier_delivery_items_delivery_id_idx" ON "cafeteria_supplier_delivery_items"("delivery_id");

-- CreateIndex
CREATE INDEX "cafeteria_nutrition_profiles_organization_id_idx" ON "cafeteria_nutrition_profiles"("organization_id");

-- CreateIndex
CREATE INDEX "cafeteria_allergy_profiles_organization_id_idx" ON "cafeteria_allergy_profiles"("organization_id");

-- CreateIndex
CREATE INDEX "cafeteria_allergy_profiles_beneficiary_type_idx" ON "cafeteria_allergy_profiles"("beneficiary_type");

-- CreateIndex
CREATE INDEX "cafeteria_meal_budgets_organization_id_idx" ON "cafeteria_meal_budgets"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "cafeteria_meal_budgets_organization_id_month_year_key" ON "cafeteria_meal_budgets"("organization_id", "month", "year");

-- CreateIndex
CREATE INDEX "cafeteria_attachments_organization_id_idx" ON "cafeteria_attachments"("organization_id");

-- CreateIndex
CREATE INDEX "cafeteria_attachments_reference_type_reference_id_idx" ON "cafeteria_attachments"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "cafeteria_notifications_organization_id_idx" ON "cafeteria_notifications"("organization_id");

-- CreateIndex
CREATE INDEX "cafeteria_notifications_is_read_idx" ON "cafeteria_notifications"("is_read");

-- CreateIndex
CREATE UNIQUE INDEX "cafeteria_settings_organization_id_key_key" ON "cafeteria_settings"("organization_id", "key");

-- CreateIndex
CREATE INDEX "cafeteria_activity_logs_organization_id_idx" ON "cafeteria_activity_logs"("organization_id");

-- AddForeignKey
ALTER TABLE "cafeteria_menu_items" ADD CONSTRAINT "cafeteria_menu_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "cafeteria_tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafeteria_recipes" ADD CONSTRAINT "cafeteria_recipes_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "cafeteria_menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafeteria_recipes" ADD CONSTRAINT "cafeteria_recipes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "cafeteria_tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafeteria_recipe_ingredients" ADD CONSTRAINT "cafeteria_recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "cafeteria_recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafeteria_meal_plans" ADD CONSTRAINT "cafeteria_meal_plans_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "cafeteria_tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafeteria_meal_plan_items" ADD CONSTRAINT "cafeteria_meal_plan_items_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "cafeteria_meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafeteria_meal_plan_items" ADD CONSTRAINT "cafeteria_meal_plan_items_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "cafeteria_menu_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafeteria_meal_productions" ADD CONSTRAINT "cafeteria_meal_productions_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "cafeteria_meal_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafeteria_meal_productions" ADD CONSTRAINT "cafeteria_meal_productions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "cafeteria_tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafeteria_meal_production_items" ADD CONSTRAINT "cafeteria_meal_production_items_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "cafeteria_meal_productions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafeteria_meal_servings" ADD CONSTRAINT "cafeteria_meal_servings_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "cafeteria_meal_productions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafeteria_food_waste" ADD CONSTRAINT "cafeteria_food_waste_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "cafeteria_meal_productions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafeteria_food_waste" ADD CONSTRAINT "cafeteria_food_waste_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "cafeteria_tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafeteria_kitchen_requests" ADD CONSTRAINT "cafeteria_kitchen_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "cafeteria_tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafeteria_kitchen_request_items" ADD CONSTRAINT "cafeteria_kitchen_request_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "cafeteria_kitchen_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafeteria_kitchen_staff" ADD CONSTRAINT "cafeteria_kitchen_staff_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "cafeteria_tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafeteria_duty_rosters" ADD CONSTRAINT "cafeteria_duty_rosters_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "cafeteria_kitchen_staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafeteria_duty_rosters" ADD CONSTRAINT "cafeteria_duty_rosters_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "cafeteria_tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafeteria_hygiene_checklists" ADD CONSTRAINT "cafeteria_hygiene_checklists_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "cafeteria_tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafeteria_hygiene_checklist_items" ADD CONSTRAINT "cafeteria_hygiene_checklist_items_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "cafeteria_hygiene_checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafeteria_cold_storage_logs" ADD CONSTRAINT "cafeteria_cold_storage_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "cafeteria_tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafeteria_supplier_deliveries" ADD CONSTRAINT "cafeteria_supplier_deliveries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "cafeteria_tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafeteria_supplier_delivery_items" ADD CONSTRAINT "cafeteria_supplier_delivery_items_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "cafeteria_supplier_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafeteria_nutrition_profiles" ADD CONSTRAINT "cafeteria_nutrition_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "cafeteria_tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafeteria_allergy_profiles" ADD CONSTRAINT "cafeteria_allergy_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "cafeteria_tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafeteria_meal_budgets" ADD CONSTRAINT "cafeteria_meal_budgets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "cafeteria_tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafeteria_attachments" ADD CONSTRAINT "cafeteria_attachments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "cafeteria_tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafeteria_notifications" ADD CONSTRAINT "cafeteria_notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "cafeteria_tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafeteria_settings" ADD CONSTRAINT "cafeteria_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "cafeteria_tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafeteria_activity_logs" ADD CONSTRAINT "cafeteria_activity_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "cafeteria_tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
