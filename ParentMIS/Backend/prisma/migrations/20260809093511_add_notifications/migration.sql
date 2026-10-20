-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "student_code" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'DISCIPLINE',
    "source_module" TEXT NOT NULL DEFAULT 'student-discipline',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "link" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_parent_id_is_read_idx" ON "notifications"("parent_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_student_id_idx" ON "notifications"("student_id");

-- CreateIndex
CREATE INDEX "notifications_organization_id_idx" ON "notifications"("organization_id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
