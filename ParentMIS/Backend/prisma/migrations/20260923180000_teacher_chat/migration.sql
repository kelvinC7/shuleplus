-- Parent ↔ teacher chat for Communication module
DO $$ BEGIN
  CREATE TYPE "TeacherChatSender" AS ENUM ('PARENT', 'TEACHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "teacher_chat_threads" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "parent_id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "student_name" TEXT NOT NULL,
  "class_name" TEXT NOT NULL,
  "teacher_user_id" TEXT NOT NULL,
  "teacher_name" TEXT NOT NULL,
  "teacher_phone" TEXT,
  "teacher_email" TEXT,
  "subjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "teacher_chat_threads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "teacher_chat_threads_org_parent_student_teacher_key"
  ON "teacher_chat_threads"("organization_id", "parent_id", "student_id", "teacher_user_id");
CREATE INDEX IF NOT EXISTS "teacher_chat_threads_org_teacher_idx"
  ON "teacher_chat_threads"("organization_id", "teacher_user_id");
CREATE INDEX IF NOT EXISTS "teacher_chat_threads_parent_idx"
  ON "teacher_chat_threads"("parent_id");

CREATE TABLE IF NOT EXISTS "teacher_chat_messages" (
  "id" TEXT NOT NULL,
  "thread_id" TEXT NOT NULL,
  "sender_role" "TeacherChatSender" NOT NULL,
  "sender_name" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "teacher_chat_messages_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "teacher_chat_messages"
    ADD CONSTRAINT "teacher_chat_messages_thread_id_fkey"
    FOREIGN KEY ("thread_id") REFERENCES "teacher_chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "teacher_chat_messages_thread_created_idx"
  ON "teacher_chat_messages"("thread_id", "created_at");
