ALTER TABLE "class_examination_timetables"
ADD COLUMN "sessions" JSONB;

ALTER TABLE "class_examination_slots"
ADD COLUMN "session_code" TEXT NOT NULL DEFAULT 'MORNING',
ADD COLUMN "session_name" TEXT NOT NULL DEFAULT 'Morning';

UPDATE "class_examination_slots"
SET
  "session_code" = "session"::TEXT,
  "session_name" = CASE "session"::TEXT
    WHEN 'AFTERNOON' THEN 'Afternoon'
    ELSE 'Morning'
  END;

DROP INDEX "class_examination_slots_timetable_id_exam_date_session_key";

CREATE UNIQUE INDEX "class_examination_slots_timetable_id_exam_date_session_code_key"
ON "class_examination_slots"("timetable_id", "exam_date", "session_code");
