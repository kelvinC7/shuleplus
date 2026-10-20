-- CreateTable
CREATE TABLE "mark_entries" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "score" DECIMAL(65,30) NOT NULL,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mark_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mark_entries_organization_id_idx" ON "mark_entries"("organization_id");

-- CreateIndex
CREATE INDEX "mark_entries_exam_id_idx" ON "mark_entries"("exam_id");

-- CreateIndex
CREATE INDEX "mark_entries_student_id_idx" ON "mark_entries"("student_id");

-- CreateIndex
CREATE INDEX "mark_entries_subject_id_idx" ON "mark_entries"("subject_id");

-- CreateIndex
CREATE INDEX "mark_entries_class_id_idx" ON "mark_entries"("class_id");

-- CreateIndex
CREATE INDEX "mark_entries_exam_id_class_id_subject_id_idx" ON "mark_entries"("exam_id", "class_id", "subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "mark_entries_exam_id_student_id_subject_id_key" ON "mark_entries"("exam_id", "student_id", "subject_id");

-- AddForeignKey
ALTER TABLE "mark_entries" ADD CONSTRAINT "mark_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mark_entries" ADD CONSTRAINT "mark_entries_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mark_entries" ADD CONSTRAINT "mark_entries_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mark_entries" ADD CONSTRAINT "mark_entries_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mark_entries" ADD CONSTRAINT "mark_entries_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
