ALTER TABLE "examination_invigilator_assignments"
ADD COLUMN "session_code" TEXT NOT NULL DEFAULT 'MORNING',
ADD COLUMN "session_name" TEXT NOT NULL DEFAULT 'Morning';

UPDATE "examination_invigilator_assignments"
SET
  "session_code" = "session"::TEXT,
  "session_name" = CASE "session"::TEXT
    WHEN 'AFTERNOON' THEN 'Afternoon'
    ELSE 'Morning'
  END;

DROP INDEX IF EXISTS "examination_invigilator_assignments_examination_list_id_roo_key";
DROP INDEX IF EXISTS "examination_invigilator_assignments_organization_id_examina_idx";
DROP INDEX IF EXISTS "examination_invigilator_assignments_teacher_user_id_exam_da_idx";

CREATE UNIQUE INDEX "exam_invig_session_identity_unique"
ON "examination_invigilator_assignments"("examination_list_id", "room_id", "exam_date", "session_code", "teacher_user_id");
CREATE INDEX "exam_invig_list_session_code_idx"
ON "examination_invigilator_assignments"("organization_id", "examination_list_id", "exam_date", "session_code");
CREATE INDEX "exam_invig_teacher_session_code_idx"
ON "examination_invigilator_assignments"("teacher_user_id", "exam_date", "session_code");

ALTER TABLE "examination_attendance"
ADD COLUMN "session_code" TEXT NOT NULL DEFAULT 'MORNING',
ADD COLUMN "session_name" TEXT NOT NULL DEFAULT 'Morning';

UPDATE "examination_attendance"
SET
  "session_code" = "session"::TEXT,
  "session_name" = CASE "session"::TEXT
    WHEN 'AFTERNOON' THEN 'Afternoon'
    ELSE 'Morning'
  END;

DROP INDEX IF EXISTS "examination_attendance_examination_list_id_room_id_exam_date_ses";
DROP INDEX IF EXISTS "examination_attendance_organization_id_examination_list_id_exam_date_session_idx";
DROP INDEX IF EXISTS "examination_attendance_room_id_exam_date_session_idx";

CREATE UNIQUE INDEX "exam_attendance_session_identity_unique"
ON "examination_attendance"("examination_list_id", "room_id", "exam_date", "session_code", "student_id");
CREATE INDEX "exam_attendance_list_session_code_idx"
ON "examination_attendance"("organization_id", "examination_list_id", "exam_date", "session_code");
CREATE INDEX "exam_attendance_room_session_code_idx"
ON "examination_attendance"("room_id", "exam_date", "session_code");
