ALTER TABLE "trip_vehicles" ADD COLUMN IF NOT EXISTS "driver_license_category" TEXT;
ALTER TABLE "trip_vehicles" ADD COLUMN IF NOT EXISTS "driver_license_number" TEXT;
