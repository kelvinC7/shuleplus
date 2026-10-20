-- Add requested_by to mark correction requests (teacher who requested the edit)
ALTER TABLE "mark_correction_requests" ADD COLUMN IF NOT EXISTS "requested_by" TEXT;

-- Student FK for correction requests (may already exist logically; enforce relation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mark_correction_requests_student_id_fkey'
  ) THEN
    ALTER TABLE "mark_correction_requests"
      ADD CONSTRAINT "mark_correction_requests_student_id_fkey"
      FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
