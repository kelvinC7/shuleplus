-- Class teacher access to student information (toggled per class by the school).
ALTER TABLE "classes"
ADD COLUMN IF NOT EXISTS "head_teacher_can_edit_students" BOOLEAN NOT NULL DEFAULT false;
