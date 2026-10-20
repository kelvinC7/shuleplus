-- AlterTable
ALTER TABLE "classes" ADD COLUMN "head_teacher_user_id" TEXT,
ADD COLUMN "head_teacher_ref_id" TEXT,
ADD COLUMN "head_teacher_name" TEXT,
ADD COLUMN "head_teacher_email" TEXT,
ADD COLUMN "head_teacher_source" TEXT;

CREATE INDEX "classes_head_teacher_user_id_idx" ON "classes"("head_teacher_user_id");
