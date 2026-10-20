/*
  Warnings:

  - You are about to drop the column `metadata` on the `activity_logs` table. All the data in the column will be lost.
  - You are about to drop the `records` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `reports` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users_cache` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `entity_id` to the `activity_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entity_type` to the `activity_logs` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED', 'RETURNED');

-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('INDIVIDUAL', 'TEAM', 'DEPARTMENT', 'ROLE');

-- CreateEnum
CREATE TYPE "WorkflowTriggerType" AS ENUM ('MANUAL', 'AUTO_ON_CREATE', 'AUTO_ON_STATUS_CHANGE', 'EVENT_BASED', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "WorkflowStepType" AS ENUM ('APPROVAL', 'REVIEW', 'EXECUTION', 'NOTIFICATION', 'CONDITION', 'PARALLEL_SPLIT', 'PARALLEL_JOIN', 'WAIT');

-- CreateEnum
CREATE TYPE "WorkflowInstanceStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "StepInstanceStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'SKIPPED', 'WAITING');

-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TASK_ASSIGNED', 'TASK_COMPLETED', 'TASK_OVERDUE', 'DEADLINE_APPROACHING', 'WORKFLOW_APPROVAL_REQUIRED', 'WORKFLOW_APPROVED', 'WORKFLOW_REJECTED', 'COMMENT_ADDED', 'MENTION', 'ESCALATION', 'STATUS_CHANGE', 'GENERAL');

-- CreateEnum
CREATE TYPE "TimeEntryType" AS ENUM ('TIMER', 'MANUAL');

-- DropForeignKey
ALTER TABLE "records" DROP CONSTRAINT "records_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_organization_id_fkey";

-- AlterTable
ALTER TABLE "activity_logs" DROP COLUMN "metadata",
ADD COLUMN     "details" JSONB,
ADD COLUMN     "entity_id" TEXT NOT NULL,
ADD COLUMN     "entity_type" TEXT NOT NULL,
ADD COLUMN     "ip_address" TEXT,
ADD COLUMN     "user_name" TEXT;

-- DropTable
DROP TABLE "records";

-- DropTable
DROP TABLE "reports";

-- DropTable
DROP TABLE "users_cache";

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "created_by_id" TEXT NOT NULL,
    "created_by_name" TEXT,
    "assigned_to_id" TEXT,
    "assigned_to_name" TEXT,
    "assigned_type" "AssignmentType" NOT NULL DEFAULT 'INDIVIDUAL',
    "department_id" TEXT,
    "start_date" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "estimated_hours" DECIMAL(8,2),
    "actual_hours" DECIMAL(8,2),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[],
    "parent_task_id" TEXT,
    "workflow_id" TEXT,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurring_config" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_comments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mentions" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_attachments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "mime_type" TEXT,
    "file_size" INTEGER,
    "uploaded_by_id" TEXT NOT NULL,
    "uploaded_by_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_dependencies" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "depends_on_id" TEXT NOT NULL,
    "dependency_type" TEXT NOT NULL DEFAULT 'finish_to_start',

    CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger_type" "WorkflowTriggerType" NOT NULL DEFAULT 'MANUAL',
    "trigger_event" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_steps" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "WorkflowStepType" NOT NULL,
    "order" INTEGER NOT NULL,
    "assignee_role" TEXT,
    "assignee_id" TEXT,
    "conditions" JSONB,
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_instances" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "task_id" TEXT,
    "status" "WorkflowInstanceStatus" NOT NULL DEFAULT 'PENDING',
    "started_by" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "current_step_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_step_instances" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "step_id" TEXT NOT NULL,
    "status" "StepInstanceStatus" NOT NULL DEFAULT 'PENDING',
    "assignee_id" TEXT,
    "assignee_name" TEXT,
    "comments" TEXT,
    "decided_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_step_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "steps_config" JSONB NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "task_id" TEXT,
    "workflow_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_entries" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_name" TEXT,
    "entry_type" "TimeEntryType" NOT NULL DEFAULT 'TIMER',
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "duration" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "is_billable" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "departments_organization_id_idx" ON "departments"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_organization_id_name_key" ON "departments"("organization_id", "name");

-- CreateIndex
CREATE INDEX "tasks_organization_id_idx" ON "tasks"("organization_id");

-- CreateIndex
CREATE INDEX "tasks_organization_id_status_idx" ON "tasks"("organization_id", "status");

-- CreateIndex
CREATE INDEX "tasks_organization_id_assigned_to_id_idx" ON "tasks"("organization_id", "assigned_to_id");

-- CreateIndex
CREATE INDEX "tasks_organization_id_priority_idx" ON "tasks"("organization_id", "priority");

-- CreateIndex
CREATE INDEX "tasks_organization_id_due_date_idx" ON "tasks"("organization_id", "due_date");

-- CreateIndex
CREATE INDEX "tasks_parent_task_id_idx" ON "tasks"("parent_task_id");

-- CreateIndex
CREATE INDEX "task_comments_task_id_idx" ON "task_comments"("task_id");

-- CreateIndex
CREATE INDEX "task_attachments_task_id_idx" ON "task_attachments"("task_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_dependencies_task_id_depends_on_id_key" ON "task_dependencies"("task_id", "depends_on_id");

-- CreateIndex
CREATE INDEX "checklist_items_task_id_idx" ON "checklist_items"("task_id");

-- CreateIndex
CREATE INDEX "workflows_organization_id_idx" ON "workflows"("organization_id");

-- CreateIndex
CREATE INDEX "workflow_steps_workflow_id_idx" ON "workflow_steps"("workflow_id");

-- CreateIndex
CREATE INDEX "workflow_instances_organization_id_idx" ON "workflow_instances"("organization_id");

-- CreateIndex
CREATE INDEX "workflow_instances_workflow_id_idx" ON "workflow_instances"("workflow_id");

-- CreateIndex
CREATE INDEX "workflow_instances_task_id_idx" ON "workflow_instances"("task_id");

-- CreateIndex
CREATE INDEX "workflow_step_instances_instance_id_idx" ON "workflow_step_instances"("instance_id");

-- CreateIndex
CREATE INDEX "workflow_templates_organization_id_idx" ON "workflow_templates"("organization_id");

-- CreateIndex
CREATE INDEX "notifications_organization_id_user_id_idx" ON "notifications"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "notifications_organization_id_user_id_is_read_idx" ON "notifications"("organization_id", "user_id", "is_read");

-- CreateIndex
CREATE INDEX "time_entries_task_id_idx" ON "time_entries"("task_id");

-- CreateIndex
CREATE INDEX "time_entries_user_id_idx" ON "time_entries"("user_id");

-- CreateIndex
CREATE INDEX "activity_logs_entity_type_entity_id_idx" ON "activity_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_depends_on_id_fkey" FOREIGN KEY ("depends_on_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_step_instances" ADD CONSTRAINT "workflow_step_instances_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_step_instances" ADD CONSTRAINT "workflow_step_instances_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "workflow_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
