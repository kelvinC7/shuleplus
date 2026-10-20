-- CreateTable
CREATE TABLE "class_monitors" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "qr_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_monitors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "class_monitors_organization_id_class_id_slot_key" ON "class_monitors"("organization_id", "class_id", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "class_monitors_organization_id_qr_code_key" ON "class_monitors"("organization_id", "qr_code");

-- CreateIndex
CREATE INDEX "class_monitors_organization_id_class_id_idx" ON "class_monitors"("organization_id", "class_id");

-- AddForeignKey
ALTER TABLE "class_monitors" ADD CONSTRAINT "class_monitors_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_monitors" ADD CONSTRAINT "class_monitors_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
