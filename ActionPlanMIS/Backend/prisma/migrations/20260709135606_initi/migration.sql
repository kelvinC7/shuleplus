/*
  Warnings:

  - You are about to drop the `activity_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `records` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `reports` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users_cache` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RETURNED');

-- CreateEnum
CREATE TYPE "DependencyType" AS ENUM ('FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('ANNUAL', 'QUARTERLY', 'MONTHLY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('INDIVIDUAL', 'MULTIPLE', 'DEPARTMENT', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- DropForeignKey
ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "records" DROP CONSTRAINT "records_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "settings" DROP CONSTRAINT "settings_organization_id_fkey";

-- DropTable
DROP TABLE "activity_logs";

-- DropTable
DROP TABLE "records";

-- DropTable
DROP TABLE "reports";

-- DropTable
DROP TABLE "settings";

-- DropTable
DROP TABLE "users_cache";

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT DEFAULT '#fcb038',
    "icon" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategic_plans" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_year" INTEGER NOT NULL,
    "end_year" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategic_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategic_goals" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "strategic_plan_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "target_value" DECIMAL(14,2),
    "progress" DECIMAL(5,2) DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategic_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "objectives" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "strategic_goal_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "target_date" TIMESTAMP(3),
    "progress" DECIMAL(5,2) DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_plans" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "strategic_goal_id" TEXT,
    "objective_id" TEXT,
    "category_id" TEXT,
    "department" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "responsible_person" TEXT,
    "team_members" JSONB NOT NULL DEFAULT '[]',
    "start_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "budget" DECIMAL(14,2) DEFAULT 0,
    "actualCost" DECIMAL(14,2) DEFAULT 0,
    "expected_outcome" TEXT,
    "progress" DECIMAL(5,2) DEFAULT 0,
    "status" "PlanStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "parent_id" TEXT,
    "period_type" "PeriodType",
    "period_year" INTEGER,
    "period_quarter" INTEGER,
    "period_month" INTEGER,
    "period_week" INTEGER,
    "qr_code" TEXT,
    "is_template" BOOLEAN NOT NULL DEFAULT false,
    "template_type" TEXT,
    "created_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "action_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_plan_tasks" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "action_plan_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "owner" TEXT,
    "start_date" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "progress" DECIMAL(5,2) DEFAULT 0,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "estimated_hours" DECIMAL(8,2),
    "actual_hours" DECIMAL(8,2),
    "created_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "action_plan_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_dependencies" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "depends_on_id" TEXT NOT NULL,
    "type" "DependencyType" NOT NULL DEFAULT 'FINISH_TO_START',
    "lag_days" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_comments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author" TEXT,
    "mentions" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_plan_assignments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "action_plan_id" TEXT,
    "task_id" TEXT,
    "assignee_id" TEXT NOT NULL,
    "assignee_name" TEXT,
    "assignment_type" "AssignmentType" NOT NULL DEFAULT 'INDIVIDUAL',
    "assigned_by" TEXT,
    "accepted_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "progress" DECIMAL(5,2) DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "action_plan_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_plan_comments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "action_plan_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "content" TEXT NOT NULL,
    "author" TEXT,
    "mentions" JSONB NOT NULL DEFAULT '[]',
    "reactions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "action_plan_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_plan_attachments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "action_plan_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "original_name" TEXT,
    "file_path" TEXT,
    "mime_type" TEXT,
    "file_size" INTEGER,
    "category" TEXT DEFAULT 'other',
    "uploaded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_plan_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_plan_status_history" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "action_plan_id" TEXT NOT NULL,
    "from_status" "PlanStatus",
    "to_status" "PlanStatus" NOT NULL,
    "changed_by" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_plan_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_plan_approvals" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "action_plan_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "approver_id" TEXT,
    "approver_name" TEXT,
    "role" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "digital_signature" TEXT,
    "signed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "action_plan_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "action_plan_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "target_date" TIMESTAMP(3) NOT NULL,
    "completed_date" TIMESTAMP(3),
    "responsible_person" TEXT,
    "evidence" TEXT,
    "progress" DECIMAL(5,2) DEFAULT 0,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "action_plan_id" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "allocated" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "spent" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "committed" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "fiscal_year" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "action_plan_id" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "description" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "expense_date" TIMESTAMP(3) NOT NULL,
    "paid_to" TEXT,
    "receipt_url" TEXT,
    "receipt_number" TEXT,
    "approved_by" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risks" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "action_plan_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "impact" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "probability" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "mitigation" TEXT,
    "contingency" TEXT,
    "owner" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issues" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "action_plan_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "IssueSeverity" NOT NULL DEFAULT 'MEDIUM',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "assigned_to" TEXT,
    "resolution" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolved_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpis" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "action_plan_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "target" DECIMAL(14,2) NOT NULL,
    "current_value" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "unit" TEXT DEFAULT '%',
    "trend" TEXT DEFAULT 'stable',
    "measurement_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_metrics" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,
    "target" DECIMAL(14,2),
    "category" TEXT,
    "period" TEXT,
    "measured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "type" TEXT NOT NULL DEFAULT 'info',
    "reference_type" TEXT,
    "reference_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "action_plan_id" TEXT,
    "task_id" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "remind_at" TIMESTAMP(3) NOT NULL,
    "is_sent" BOOLEAN NOT NULL DEFAULT false,
    "recurrence_type" "RecurrenceType",
    "recurrence_interval" INTEGER,
    "sent_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "action_plan_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "agenda" JSONB NOT NULL DEFAULT '[]',
    "location" TEXT,
    "meeting_date" TIMESTAMP(3) NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "participants" JSONB NOT NULL DEFAULT '[]',
    "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_minutes" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author" TEXT,
    "decision" BOOLEAN NOT NULL DEFAULT false,
    "actionItem" TEXT,
    "assigned_to" TEXT,
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_minutes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_plans" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "recurrence_type" "RecurrenceType" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "next_generation" TIMESTAMP(3),
    "template_id" TEXT,
    "department" TEXT,
    "responsible_person" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "budget" DECIMAL(14,2) DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_generated_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_allocations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "action_plan_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "allocated_from" TIMESTAMP(3) NOT NULL,
    "allocated_to" TIMESTAMP(3),
    "cost" DECIMAL(14,2) DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ALLOCATED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_plan_versions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "action_plan_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "changed_by" TEXT,
    "change_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_plan_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "changes" JSONB NOT NULL DEFAULT '{}',
    "ip_address" TEXT,
    "user_agent" TEXT,
    "browser" TEXT,
    "device" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_plan_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'general',
    "templateData" JSONB NOT NULL DEFAULT '{}',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "action_plan_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "categories_organization_id_idx" ON "categories"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_organization_id_name_key" ON "categories"("organization_id", "name");

-- CreateIndex
CREATE INDEX "strategic_plans_organization_id_idx" ON "strategic_plans"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "strategic_plans_organization_id_title_key" ON "strategic_plans"("organization_id", "title");

-- CreateIndex
CREATE INDEX "strategic_goals_organization_id_idx" ON "strategic_goals"("organization_id");

-- CreateIndex
CREATE INDEX "strategic_goals_strategic_plan_id_idx" ON "strategic_goals"("strategic_plan_id");

-- CreateIndex
CREATE INDEX "objectives_organization_id_idx" ON "objectives"("organization_id");

-- CreateIndex
CREATE INDEX "objectives_strategic_goal_id_idx" ON "objectives"("strategic_goal_id");

-- CreateIndex
CREATE INDEX "action_plans_organization_id_idx" ON "action_plans"("organization_id");

-- CreateIndex
CREATE INDEX "action_plans_organization_id_status_idx" ON "action_plans"("organization_id", "status");

-- CreateIndex
CREATE INDEX "action_plans_category_id_idx" ON "action_plans"("category_id");

-- CreateIndex
CREATE INDEX "action_plans_parent_id_idx" ON "action_plans"("parent_id");

-- CreateIndex
CREATE INDEX "action_plan_tasks_organization_id_idx" ON "action_plan_tasks"("organization_id");

-- CreateIndex
CREATE INDEX "action_plan_tasks_action_plan_id_idx" ON "action_plan_tasks"("action_plan_id");

-- CreateIndex
CREATE INDEX "action_plan_tasks_parent_id_idx" ON "action_plan_tasks"("parent_id");

-- CreateIndex
CREATE INDEX "task_dependencies_organization_id_idx" ON "task_dependencies"("organization_id");

-- CreateIndex
CREATE INDEX "task_dependencies_task_id_idx" ON "task_dependencies"("task_id");

-- CreateIndex
CREATE INDEX "task_dependencies_depends_on_id_idx" ON "task_dependencies"("depends_on_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_dependencies_task_id_depends_on_id_key" ON "task_dependencies"("task_id", "depends_on_id");

-- CreateIndex
CREATE INDEX "task_comments_organization_id_idx" ON "task_comments"("organization_id");

-- CreateIndex
CREATE INDEX "task_comments_task_id_idx" ON "task_comments"("task_id");

-- CreateIndex
CREATE INDEX "action_plan_assignments_organization_id_idx" ON "action_plan_assignments"("organization_id");

-- CreateIndex
CREATE INDEX "action_plan_assignments_action_plan_id_idx" ON "action_plan_assignments"("action_plan_id");

-- CreateIndex
CREATE INDEX "action_plan_assignments_task_id_idx" ON "action_plan_assignments"("task_id");

-- CreateIndex
CREATE INDEX "action_plan_assignments_assignee_id_idx" ON "action_plan_assignments"("assignee_id");

-- CreateIndex
CREATE INDEX "action_plan_comments_organization_id_idx" ON "action_plan_comments"("organization_id");

-- CreateIndex
CREATE INDEX "action_plan_comments_action_plan_id_idx" ON "action_plan_comments"("action_plan_id");

-- CreateIndex
CREATE INDEX "action_plan_attachments_organization_id_idx" ON "action_plan_attachments"("organization_id");

-- CreateIndex
CREATE INDEX "action_plan_attachments_action_plan_id_idx" ON "action_plan_attachments"("action_plan_id");

-- CreateIndex
CREATE INDEX "action_plan_status_history_organization_id_idx" ON "action_plan_status_history"("organization_id");

-- CreateIndex
CREATE INDEX "action_plan_status_history_action_plan_id_idx" ON "action_plan_status_history"("action_plan_id");

-- CreateIndex
CREATE INDEX "action_plan_approvals_organization_id_idx" ON "action_plan_approvals"("organization_id");

-- CreateIndex
CREATE INDEX "action_plan_approvals_action_plan_id_idx" ON "action_plan_approvals"("action_plan_id");

-- CreateIndex
CREATE INDEX "action_plan_approvals_approver_id_idx" ON "action_plan_approvals"("approver_id");

-- CreateIndex
CREATE INDEX "milestones_organization_id_idx" ON "milestones"("organization_id");

-- CreateIndex
CREATE INDEX "milestones_action_plan_id_idx" ON "milestones"("action_plan_id");

-- CreateIndex
CREATE INDEX "budgets_organization_id_idx" ON "budgets"("organization_id");

-- CreateIndex
CREATE INDEX "budgets_action_plan_id_idx" ON "budgets"("action_plan_id");

-- CreateIndex
CREATE INDEX "expenses_organization_id_idx" ON "expenses"("organization_id");

-- CreateIndex
CREATE INDEX "expenses_action_plan_id_idx" ON "expenses"("action_plan_id");

-- CreateIndex
CREATE INDEX "expenses_category_idx" ON "expenses"("category");

-- CreateIndex
CREATE INDEX "risks_organization_id_idx" ON "risks"("organization_id");

-- CreateIndex
CREATE INDEX "risks_action_plan_id_idx" ON "risks"("action_plan_id");

-- CreateIndex
CREATE INDEX "issues_organization_id_idx" ON "issues"("organization_id");

-- CreateIndex
CREATE INDEX "issues_action_plan_id_idx" ON "issues"("action_plan_id");

-- CreateIndex
CREATE INDEX "kpis_organization_id_idx" ON "kpis"("organization_id");

-- CreateIndex
CREATE INDEX "kpis_action_plan_id_idx" ON "kpis"("action_plan_id");

-- CreateIndex
CREATE INDEX "performance_metrics_organization_id_idx" ON "performance_metrics"("organization_id");

-- CreateIndex
CREATE INDEX "performance_metrics_category_idx" ON "performance_metrics"("category");

-- CreateIndex
CREATE INDEX "notifications_organization_id_idx" ON "notifications"("organization_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "reminders_organization_id_idx" ON "reminders"("organization_id");

-- CreateIndex
CREATE INDEX "reminders_action_plan_id_idx" ON "reminders"("action_plan_id");

-- CreateIndex
CREATE INDEX "reminders_remind_at_idx" ON "reminders"("remind_at");

-- CreateIndex
CREATE INDEX "meetings_organization_id_idx" ON "meetings"("organization_id");

-- CreateIndex
CREATE INDEX "meetings_action_plan_id_idx" ON "meetings"("action_plan_id");

-- CreateIndex
CREATE INDEX "meeting_minutes_organization_id_idx" ON "meeting_minutes"("organization_id");

-- CreateIndex
CREATE INDEX "meeting_minutes_meeting_id_idx" ON "meeting_minutes"("meeting_id");

-- CreateIndex
CREATE INDEX "recurring_plans_organization_id_idx" ON "recurring_plans"("organization_id");

-- CreateIndex
CREATE INDEX "resource_allocations_organization_id_idx" ON "resource_allocations"("organization_id");

-- CreateIndex
CREATE INDEX "resource_allocations_action_plan_id_idx" ON "resource_allocations"("action_plan_id");

-- CreateIndex
CREATE INDEX "resource_allocations_resource_type_idx" ON "resource_allocations"("resource_type");

-- CreateIndex
CREATE INDEX "action_plan_versions_organization_id_idx" ON "action_plan_versions"("organization_id");

-- CreateIndex
CREATE INDEX "action_plan_versions_action_plan_id_idx" ON "action_plan_versions"("action_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "action_plan_versions_action_plan_id_version_key" ON "action_plan_versions"("action_plan_id", "version");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_idx" ON "audit_logs"("organization_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "action_plan_templates_organization_id_idx" ON "action_plan_templates"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "action_plan_templates_organization_id_name_key" ON "action_plan_templates"("organization_id", "name");

-- AddForeignKey
ALTER TABLE "strategic_goals" ADD CONSTRAINT "strategic_goals_strategic_plan_id_fkey" FOREIGN KEY ("strategic_plan_id") REFERENCES "strategic_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_strategic_goal_id_fkey" FOREIGN KEY ("strategic_goal_id") REFERENCES "strategic_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_plans" ADD CONSTRAINT "action_plans_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_plans" ADD CONSTRAINT "action_plans_objective_id_fkey" FOREIGN KEY ("objective_id") REFERENCES "objectives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_plan_tasks" ADD CONSTRAINT "action_plan_tasks_action_plan_id_fkey" FOREIGN KEY ("action_plan_id") REFERENCES "action_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_plan_tasks" ADD CONSTRAINT "action_plan_tasks_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "action_plan_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "action_plan_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_depends_on_id_fkey" FOREIGN KEY ("depends_on_id") REFERENCES "action_plan_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "action_plan_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_plan_assignments" ADD CONSTRAINT "action_plan_assignments_action_plan_id_fkey" FOREIGN KEY ("action_plan_id") REFERENCES "action_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_plan_assignments" ADD CONSTRAINT "action_plan_assignments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "action_plan_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_plan_comments" ADD CONSTRAINT "action_plan_comments_action_plan_id_fkey" FOREIGN KEY ("action_plan_id") REFERENCES "action_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_plan_comments" ADD CONSTRAINT "action_plan_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "action_plan_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_plan_attachments" ADD CONSTRAINT "action_plan_attachments_action_plan_id_fkey" FOREIGN KEY ("action_plan_id") REFERENCES "action_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_plan_status_history" ADD CONSTRAINT "action_plan_status_history_action_plan_id_fkey" FOREIGN KEY ("action_plan_id") REFERENCES "action_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_plan_approvals" ADD CONSTRAINT "action_plan_approvals_action_plan_id_fkey" FOREIGN KEY ("action_plan_id") REFERENCES "action_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_action_plan_id_fkey" FOREIGN KEY ("action_plan_id") REFERENCES "action_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_action_plan_id_fkey" FOREIGN KEY ("action_plan_id") REFERENCES "action_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_action_plan_id_fkey" FOREIGN KEY ("action_plan_id") REFERENCES "action_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_action_plan_id_fkey" FOREIGN KEY ("action_plan_id") REFERENCES "action_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_action_plan_id_fkey" FOREIGN KEY ("action_plan_id") REFERENCES "action_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpis" ADD CONSTRAINT "kpis_action_plan_id_fkey" FOREIGN KEY ("action_plan_id") REFERENCES "action_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_minutes" ADD CONSTRAINT "meeting_minutes_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_allocations" ADD CONSTRAINT "resource_allocations_action_plan_id_fkey" FOREIGN KEY ("action_plan_id") REFERENCES "action_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_plan_versions" ADD CONSTRAINT "action_plan_versions_action_plan_id_fkey" FOREIGN KEY ("action_plan_id") REFERENCES "action_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
