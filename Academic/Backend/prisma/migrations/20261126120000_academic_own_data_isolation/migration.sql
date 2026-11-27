-- Part-1 IAM data isolation: record the owning IAM user on examination
-- timetables and examination lists so a module USER only sees their own work
-- (module HEAD / organization users still see everything).

ALTER TABLE "class_examination_timetables" ADD COLUMN "created_by" TEXT;
ALTER TABLE "examination_lists" ADD COLUMN "created_by" TEXT;
ALTER TABLE "exams" ADD COLUMN "created_by" TEXT;

CREATE INDEX "class_examination_timetables_organization_id_created_by_idx"
  ON "class_examination_timetables"("organization_id", "created_by");
CREATE INDEX "examination_lists_organization_id_created_by_idx"
  ON "examination_lists"("organization_id", "created_by");
