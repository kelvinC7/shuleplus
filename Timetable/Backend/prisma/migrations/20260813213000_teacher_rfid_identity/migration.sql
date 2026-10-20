ALTER TABLE "timetable_teacher_profiles" ADD COLUMN IF NOT EXISTS "rfid_uid" TEXT;
ALTER TABLE "timetable_teacher_profiles" ADD COLUMN IF NOT EXISTS "fingerprint_id" TEXT;
ALTER TABLE "timetable_teacher_profiles" ADD COLUMN IF NOT EXISTS "identity_remarks" TEXT;
