-- Exam eligibility lists (draft/publish workflow)
CREATE TYPE "ExamListStatus" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TYPE "ExamFinancialStatus" AS ENUM ('CLEARED', 'NOT_CLEARED');

CREATE TYPE "ExamDecision" AS ENUM ('AUTO_ALLOWED', 'NOT_ALLOWED', 'MANUALLY_ALLOWED', 'MANUALLY_BLOCKED');

CREATE TABLE "exam_eligibility_lists" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "class_name" TEXT NOT NULL,
    "exam_name" TEXT NOT NULL,
    "status" "ExamListStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "version_label" TEXT,
    "published_at" TIMESTAMP(3),
    "published_by_id" TEXT,
    "published_by_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_eligibility_lists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exam_eligibility_students" (
    "id" TEXT NOT NULL,
    "list_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "student_code" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "class_name" TEXT NOT NULL,
    "total_fees" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "financial_status" "ExamFinancialStatus" NOT NULL,
    "decision" "ExamDecision" NOT NULL DEFAULT 'NOT_ALLOWED',
    "exception_reason" TEXT,
    "exception_note" TEXT,
    "exception_reference" TEXT,
    "exception_by_id" TEXT,
    "exception_by_name" TEXT,
    "exception_at" TIMESTAMP(3),

    CONSTRAINT "exam_eligibility_students_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exam_eligibility_audits" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "list_id" TEXT,
    "student_id" TEXT,
    "student_code" TEXT,
    "action" TEXT NOT NULL,
    "decision" TEXT,
    "reason" TEXT,
    "note" TEXT,
    "reference" TEXT,
    "actor_id" TEXT,
    "actor_name" TEXT,
    "balance" DECIMAL(14,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_eligibility_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "exam_eligibility_lists_organization_id_academic_year_term_c_idx" ON "exam_eligibility_lists"("organization_id", "academic_year", "term", "class_name", "status");

CREATE UNIQUE INDEX "exam_eligibility_lists_organization_id_academic_year_term_c_key" ON "exam_eligibility_lists"("organization_id", "academic_year", "term", "class_name", "exam_name", "version");

CREATE INDEX "exam_eligibility_students_student_code_idx" ON "exam_eligibility_students"("student_code");

CREATE INDEX "exam_eligibility_students_student_id_idx" ON "exam_eligibility_students"("student_id");

CREATE UNIQUE INDEX "exam_eligibility_students_list_id_student_id_key" ON "exam_eligibility_students"("list_id", "student_id");

CREATE INDEX "exam_eligibility_audits_organization_id_created_at_idx" ON "exam_eligibility_audits"("organization_id", "created_at");

ALTER TABLE "exam_eligibility_students" ADD CONSTRAINT "exam_eligibility_students_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "exam_eligibility_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "exam_eligibility_audits" ADD CONSTRAINT "exam_eligibility_audits_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "exam_eligibility_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
