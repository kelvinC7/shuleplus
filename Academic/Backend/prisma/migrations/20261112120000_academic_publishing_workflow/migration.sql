-- Academic publishing workflow: batches, recipients, access policy, submissions/approvals, audit, notification hooks

DO $$ BEGIN
  CREATE TYPE "PublicationAccessPolicy" AS ENUM ('PAID_ONLY', 'ALL_PARENTS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PublicationBatchStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PARTIALLY_PUBLISHED', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MarksSubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'RETURNED', 'APPROVED', 'PUBLISHED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MarksApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'RETURNED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "report_publication_batches" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "academic_year" TEXT NOT NULL,
  "term" TEXT NOT NULL,
  "report_kind" TEXT NOT NULL DEFAULT 'standard',
  "publication_type" TEXT,
  "class_id" TEXT,
  "class_name" TEXT,
  "access_policy" "PublicationAccessPolicy" NOT NULL DEFAULT 'PAID_ONLY',
  "status" "PublicationBatchStatus" NOT NULL DEFAULT 'PUBLISHED',
  "notify_in_app" BOOLEAN NOT NULL DEFAULT true,
  "notify_push" BOOLEAN NOT NULL DEFAULT true,
  "include_report_link" BOOLEAN NOT NULL DEFAULT true,
  "selected_count" INTEGER NOT NULL DEFAULT 0,
  "published_count" INTEGER NOT NULL DEFAULT 0,
  "skipped_count" INTEGER NOT NULL DEFAULT 0,
  "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "published_by" TEXT,
  "published_by_name" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "report_publication_batches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "report_publication_batches_organization_id_idx" ON "report_publication_batches"("organization_id");
CREATE INDEX IF NOT EXISTS "report_publication_batches_academic_year_term_idx" ON "report_publication_batches"("academic_year", "term");
CREATE INDEX IF NOT EXISTS "report_publication_batches_class_id_idx" ON "report_publication_batches"("class_id");
CREATE INDEX IF NOT EXISTS "report_publication_batches_published_at_idx" ON "report_publication_batches"("published_at");

ALTER TABLE "report_card_publications" ADD COLUMN IF NOT EXISTS "batch_id" TEXT;
ALTER TABLE "report_card_publications" ADD COLUMN IF NOT EXISTS "access_policy" "PublicationAccessPolicy" NOT NULL DEFAULT 'PAID_ONLY';
ALTER TABLE "report_card_publications" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE "report_card_publications" ADD COLUMN IF NOT EXISTS "granted_by" TEXT;
ALTER TABLE "report_card_publications" ADD COLUMN IF NOT EXISTS "granted_at" TIMESTAMP(3);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'report_card_publications_batch_id_fkey') THEN
    ALTER TABLE "report_card_publications"
      ADD CONSTRAINT "report_card_publications_batch_id_fkey"
      FOREIGN KEY ("batch_id") REFERENCES "report_publication_batches"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "report_card_publications_batch_id_idx" ON "report_card_publications"("batch_id");
CREATE INDEX IF NOT EXISTS "report_card_publications_access_policy_idx" ON "report_card_publications"("access_policy");

CREATE TABLE IF NOT EXISTS "report_publication_recipients" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "batch_id" TEXT NOT NULL,
  "publication_id" TEXT,
  "student_id" TEXT NOT NULL,
  "student_name" TEXT,
  "student_code" TEXT,
  "class_id" TEXT,
  "class_name" TEXT,
  "access_policy" "PublicationAccessPolicy" NOT NULL DEFAULT 'PAID_ONLY',
  "delivery_status" TEXT NOT NULL DEFAULT 'PENDING',
  "notification_status" TEXT NOT NULL DEFAULT 'PENDING',
  "push_status" TEXT NOT NULL DEFAULT 'PENDING',
  "viewed_at" TIMESTAMP(3),
  "granted_at" TIMESTAMP(3),
  "granted_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "report_publication_recipients_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "report_publication_recipients_organization_id_idx" ON "report_publication_recipients"("organization_id");
CREATE INDEX IF NOT EXISTS "report_publication_recipients_batch_id_idx" ON "report_publication_recipients"("batch_id");
CREATE INDEX IF NOT EXISTS "report_publication_recipients_student_id_idx" ON "report_publication_recipients"("student_id");
CREATE INDEX IF NOT EXISTS "report_publication_recipients_publication_id_idx" ON "report_publication_recipients"("publication_id");
CREATE UNIQUE INDEX IF NOT EXISTS "report_publication_recipients_batch_id_student_id_key" ON "report_publication_recipients"("batch_id", "student_id");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'report_publication_recipients_batch_id_fkey') THEN
    ALTER TABLE "report_publication_recipients"
      ADD CONSTRAINT "report_publication_recipients_batch_id_fkey"
      FOREIGN KEY ("batch_id") REFERENCES "report_publication_batches"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'report_publication_recipients_publication_id_fkey') THEN
    ALTER TABLE "report_publication_recipients"
      ADD CONSTRAINT "report_publication_recipients_publication_id_fkey"
      FOREIGN KEY ("publication_id") REFERENCES "report_card_publications"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "marks_submissions" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "assessment_id" TEXT,
  "class_id" TEXT,
  "subject_id" TEXT,
  "academic_year" TEXT NOT NULL,
  "term" TEXT NOT NULL,
  "submitted_by" TEXT,
  "submitted_by_name" TEXT,
  "submitted_at" TIMESTAMP(3),
  "status" "MarksSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
  "note" TEXT,
  "return_reason" TEXT,
  "reviewed_by" TEXT,
  "reviewed_by_name" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "approved_by" TEXT,
  "approved_by_name" TEXT,
  "approved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "marks_submissions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "marks_submissions_organization_id_idx" ON "marks_submissions"("organization_id");
CREATE INDEX IF NOT EXISTS "marks_submissions_assessment_id_idx" ON "marks_submissions"("assessment_id");
CREATE INDEX IF NOT EXISTS "marks_submissions_class_id_idx" ON "marks_submissions"("class_id");
CREATE INDEX IF NOT EXISTS "marks_submissions_status_idx" ON "marks_submissions"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "marks_submissions_org_assessment_period_key" ON "marks_submissions"("organization_id", "assessment_id", "academic_year", "term");

CREATE TABLE IF NOT EXISTS "marks_submission_approvals" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "submission_id" TEXT NOT NULL,
  "action" "MarksApprovalStatus" NOT NULL,
  "actor_id" TEXT,
  "actor_name" TEXT,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "marks_submission_approvals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "marks_submission_approvals_organization_id_idx" ON "marks_submission_approvals"("organization_id");
CREATE INDEX IF NOT EXISTS "marks_submission_approvals_submission_id_idx" ON "marks_submission_approvals"("submission_id");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marks_submission_approvals_submission_id_fkey') THEN
    ALTER TABLE "marks_submission_approvals"
      ADD CONSTRAINT "marks_submission_approvals_submission_id_fkey"
      FOREIGN KEY ("submission_id") REFERENCES "marks_submissions"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "academic_audit_events" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "entity_type" TEXT,
  "entity_id" TEXT,
  "actor_id" TEXT,
  "actor_name" TEXT,
  "actor_role" TEXT,
  "summary" TEXT,
  "details" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "academic_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "academic_audit_events_organization_id_idx" ON "academic_audit_events"("organization_id");
CREATE INDEX IF NOT EXISTS "academic_audit_events_event_type_idx" ON "academic_audit_events"("event_type");
CREATE INDEX IF NOT EXISTS "academic_audit_events_entity_type_entity_id_idx" ON "academic_audit_events"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "academic_audit_events_created_at_idx" ON "academic_audit_events"("created_at");

CREATE TABLE IF NOT EXISTS "notification_outbox" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "recipient_type" TEXT,
  "recipient_id" TEXT,
  "recipient_ref" TEXT,
  "title" TEXT,
  "body" TEXT,
  "link" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "payload" JSONB,
  "error_message" TEXT,
  "sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_outbox_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notification_outbox_organization_id_idx" ON "notification_outbox"("organization_id");
CREATE INDEX IF NOT EXISTS "notification_outbox_status_idx" ON "notification_outbox"("status");
CREATE INDEX IF NOT EXISTS "notification_outbox_channel_idx" ON "notification_outbox"("channel");