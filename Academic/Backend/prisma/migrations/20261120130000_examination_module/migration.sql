-- CreateEnum
CREATE TYPE "ExaminationSessionPeriod" AS ENUM ('MORNING', 'AFTERNOON');

-- CreateEnum
CREATE TYPE "ExaminationDistributionMethod" AS ENUM ('KEEP_CLASS', 'MIX_CLASSES');

-- CreateEnum
CREATE TYPE "ExaminationListStatus" AS ENUM ('DRAFT', 'GENERATED');

-- CreateTable
CREATE TABLE "class_examination_timetables" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "class_name" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "exclude_weekends" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_examination_timetables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_examination_slots" (
    "id" TEXT NOT NULL,
    "timetable_id" TEXT NOT NULL,
    "exam_date" TIMESTAMP(3) NOT NULL,
    "session" "ExaminationSessionPeriod" NOT NULL,
    "course_name" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_examination_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "examination_lists" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "name" TEXT,
    "distribution_method" "ExaminationDistributionMethod" NOT NULL,
    "mix_quantity" INTEGER,
    "default_capacity" INTEGER NOT NULL DEFAULT 40,
    "status" "ExaminationListStatus" NOT NULL DEFAULT 'DRAFT',
    "generated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "examination_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "examination_list_rooms" (
    "id" TEXT NOT NULL,
    "list_id" TEXT NOT NULL,
    "source_room_id" TEXT,
    "room_name" TEXT NOT NULL,
    "room_number" TEXT,
    "capacity" INTEGER NOT NULL,
    "is_unique_capacity" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "examination_list_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "examination_list_classes" (
    "id" TEXT NOT NULL,
    "list_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "class_name" TEXT NOT NULL,
    "student_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "examination_list_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "examination_allocations" (
    "id" TEXT NOT NULL,
    "list_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "student_code" TEXT,
    "student_name" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "class_name" TEXT NOT NULL,
    "gender" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "examination_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "class_examination_timetables_organization_id_class_id_academ_key" ON "class_examination_timetables"("organization_id", "class_id", "academic_year", "term");

-- CreateIndex
CREATE INDEX "class_examination_timetables_organization_id_academic_year_t_idx" ON "class_examination_timetables"("organization_id", "academic_year", "term");

-- CreateIndex
CREATE UNIQUE INDEX "class_examination_slots_timetable_id_exam_date_session_key" ON "class_examination_slots"("timetable_id", "exam_date", "session");

-- CreateIndex
CREATE INDEX "class_examination_slots_timetable_id_exam_date_idx" ON "class_examination_slots"("timetable_id", "exam_date");

-- CreateIndex
CREATE INDEX "examination_lists_organization_id_academic_year_term_idx" ON "examination_lists"("organization_id", "academic_year", "term");

-- CreateIndex
CREATE INDEX "examination_list_rooms_list_id_idx" ON "examination_list_rooms"("list_id");

-- CreateIndex
CREATE UNIQUE INDEX "examination_list_classes_list_id_class_id_key" ON "examination_list_classes"("list_id", "class_id");

-- CreateIndex
CREATE INDEX "examination_list_classes_list_id_idx" ON "examination_list_classes"("list_id");

-- CreateIndex
CREATE UNIQUE INDEX "examination_allocations_list_id_student_id_key" ON "examination_allocations"("list_id", "student_id");

-- CreateIndex
CREATE INDEX "examination_allocations_list_id_idx" ON "examination_allocations"("list_id");

-- CreateIndex
CREATE INDEX "examination_allocations_room_id_idx" ON "examination_allocations"("room_id");

-- AddForeignKey
ALTER TABLE "class_examination_timetables" ADD CONSTRAINT "class_examination_timetables_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_examination_slots" ADD CONSTRAINT "class_examination_slots_timetable_id_fkey" FOREIGN KEY ("timetable_id") REFERENCES "class_examination_timetables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examination_lists" ADD CONSTRAINT "examination_lists_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examination_list_rooms" ADD CONSTRAINT "examination_list_rooms_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "examination_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examination_list_classes" ADD CONSTRAINT "examination_list_classes_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "examination_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examination_allocations" ADD CONSTRAINT "examination_allocations_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "examination_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examination_allocations" ADD CONSTRAINT "examination_allocations_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "examination_list_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
