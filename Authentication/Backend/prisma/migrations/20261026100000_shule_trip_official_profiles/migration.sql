-- ShuleTrip government officials (IAM Super Admin)
CREATE TABLE IF NOT EXISTS "shule_trip_official_profiles" (
    "user_id" TEXT NOT NULL,
    "trip_role_slug" TEXT NOT NULL,
    "authority" TEXT,
    "jurisdiction_scope" TEXT NOT NULL DEFAULT 'districts',
    "province_id" TEXT,
    "province_name" TEXT,
    "district_id" TEXT,
    "district_name" TEXT,
    "sector_id" TEXT,
    "sector_name" TEXT,
    "can_final_approve" BOOLEAN NOT NULL DEFAULT false,
    "employee_ref" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shule_trip_official_profiles_pkey" PRIMARY KEY ("user_id")
);

ALTER TABLE "shule_trip_official_profiles"
    DROP CONSTRAINT IF EXISTS "shule_trip_official_profiles_user_id_fkey";

ALTER TABLE "shule_trip_official_profiles"
    ADD CONSTRAINT "shule_trip_official_profiles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
