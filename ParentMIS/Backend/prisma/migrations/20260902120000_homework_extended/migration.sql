-- Extend homework for teacher assignments, quiz questions, and parent submissions
ALTER TABLE "homework" ADD COLUMN IF NOT EXISTS "assignment_id" TEXT;
ALTER TABLE "homework" ADD COLUMN IF NOT EXISTS "homework_type" TEXT NOT NULL DEFAULT 'TEXT';
ALTER TABLE "homework" ADD COLUMN IF NOT EXISTS "class_name" TEXT;
ALTER TABLE "homework" ADD COLUMN IF NOT EXISTS "max_score" DOUBLE PRECISION;
ALTER TABLE "homework" ADD COLUMN IF NOT EXISTS "estimated_minutes" INTEGER;
ALTER TABLE "homework" ADD COLUMN IF NOT EXISTS "question_count" INTEGER;
ALTER TABLE "homework" ADD COLUMN IF NOT EXISTS "questions_json" JSONB;
ALTER TABLE "homework" ADD COLUMN IF NOT EXISTS "attachment_url" TEXT;
ALTER TABLE "homework" ADD COLUMN IF NOT EXISTS "attachment_name" TEXT;
ALTER TABLE "homework" ADD COLUMN IF NOT EXISTS "resource_url" TEXT;
ALTER TABLE "homework" ADD COLUMN IF NOT EXISTS "submission_mode" TEXT;
ALTER TABLE "homework" ADD COLUMN IF NOT EXISTS "answers_json" JSONB;
ALTER TABLE "homework" ADD COLUMN IF NOT EXISTS "score" DOUBLE PRECISION;
ALTER TABLE "homework" ADD COLUMN IF NOT EXISTS "feedback" TEXT;
ALTER TABLE "homework" ADD COLUMN IF NOT EXISTS "submitted_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "homework_assignment_id_idx" ON "homework"("assignment_id");
