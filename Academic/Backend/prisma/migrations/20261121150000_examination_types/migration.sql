-- CreateTable
CREATE TABLE "examination_types" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "examination_types_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "class_examination_timetables" ADD COLUMN "examination_type_id" TEXT;

-- AlterTable
ALTER TABLE "examination_lists" ADD COLUMN "examination_type_id" TEXT;

-- DropIndex
DROP INDEX IF EXISTS "class_examination_timetables_organization_id_class_id_academ_key";

-- CreateIndex
CREATE UNIQUE INDEX "examination_types_organization_id_academic_year_term_name_key" ON "examination_types"("organization_id", "academic_year", "term", "name");

-- CreateIndex
CREATE INDEX "examination_types_organization_id_academic_year_term_idx" ON "examination_types"("organization_id", "academic_year", "term");

-- CreateIndex
CREATE UNIQUE INDEX "class_examination_timetables_organization_id_class_id_academ_key" ON "class_examination_timetables"("organization_id", "class_id", "academic_year", "term", "examination_type_id");

-- CreateIndex
CREATE INDEX "class_examination_timetables_examination_type_id_idx" ON "class_examination_timetables"("examination_type_id");

-- CreateIndex
CREATE INDEX "examination_lists_examination_type_id_idx" ON "examination_lists"("examination_type_id");

-- AddForeignKey
ALTER TABLE "examination_types" ADD CONSTRAINT "examination_types_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_examination_timetables" ADD CONSTRAINT "class_examination_timetables_examination_type_id_fkey" FOREIGN KEY ("examination_type_id") REFERENCES "examination_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examination_lists" ADD CONSTRAINT "examination_lists_examination_type_id_fkey" FOREIGN KEY ("examination_type_id") REFERENCES "examination_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
