-- CreateTable
CREATE TABLE "class_timetable_publishes" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "class_name" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "lesson_count" INTEGER NOT NULL DEFAULT 0,
    "confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_by_user_id" TEXT,

    CONSTRAINT "class_timetable_publishes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "class_timetable_publishes_organization_id_class_name_term_academic_year_key" ON "class_timetable_publishes"("organization_id", "class_name", "term", "academic_year");

-- CreateIndex
CREATE INDEX "class_timetable_publishes_organization_id_term_academic_year_idx" ON "class_timetable_publishes"("organization_id", "term", "academic_year");

-- Backfill: existing timetables stay visible to teachers until admins use confirm for new edits
INSERT INTO "class_timetable_publishes" ("id", "organization_id", "class_name", "term", "academic_year", "lesson_count", "confirmed_at")
SELECT
  gen_random_uuid()::text,
  "organization_id",
  "class_name",
  "term",
  "academic_year",
  COUNT(*)::int,
  NOW()
FROM "academic_timetables"
WHERE "is_extra_activity" = false
GROUP BY "organization_id", "class_name", "term", "academic_year"
ON CONFLICT ("organization_id", "class_name", "term", "academic_year") DO NOTHING;
