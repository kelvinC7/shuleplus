import { Prisma, WorkflowTriggerType, WorkflowStepType, WorkflowInstanceStatus, StepInstanceStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { WORKFLOW_TEMPLATES } from '../constants/task.constants';

export class WorkflowService {
  async list(orgId: string, filters: Record<string, string | undefined>) {
    const where: Prisma.WorkflowWhereInput = { organizationId: orgId };
    if (filters.isActive !== undefined) where.isActive = filters.isActive === 'true';
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const workflows = await prisma.workflow.findMany({
      where,
      include: {
        steps: { orderBy: { order: 'asc' } },
        _count: { select: { instances: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return workflows.map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      triggerType: w.triggerType,
      triggerEvent: w.triggerEvent,
      isActive: w.isActive,
      version: w.version,
      createdBy: w.createdBy,
      steps: w.steps.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        order: s.order,
        assigneeRole: s.assigneeRole,
        assigneeId: s.assigneeId,
        conditions: s.conditions,
        config: s.config,
      })),
      instanceCount: w._count.instances,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    }));
  }

  async getById(orgId: string, id: string) {
    const workflow = await prisma.workflow.findFirst({
      where: { id, organizationId: orgId },
      include: {
        steps: { orderBy: { order: 'asc' } },
        instances: {
          orderBy: { startedAt: 'desc' },
          take: 10,
          include: { steps: true },
        },
        _count: { select: { instances: true } },
      },
    });
    if (!workflow) throw new AppError(404, 'Workflow not found');
    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      triggerType: workflow.triggerType,
      triggerEvent: workflow.triggerEvent,
      isActive: workflow.isActive,
      version: workflow.version,
      createdBy: workflow.createdBy,
      steps: workflow.steps.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        order: s.order,
        assigneeRole: s.assigneeRole,
        assigneeId: s.assigneeId,
        conditions: s.conditions,
        config: s.config,
      })),
      instances: workflow.instances.map((i) => ({
        id: i.id,
        status: i.status,
        startedBy: i.startedBy,
        startedAt: i.startedAt,
        completedAt: i.completedAt,
        steps: i.steps.map((s) => ({
          id: s.id,
          stepId: s.stepId,
          status: s.status,
          assigneeName: s.assigneeName,
          decidedAt: s.decidedAt,
        })),
      })),
      instanceCount: workflow._count.instances,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
    };
  }

  async create(orgId: string, userId: string, data: Record<string, unknown>) {
    const workflow = await prisma.workflow.create({
      data: {
        organizationId: orgId,
        name: String(data.name),
        description: data.description ? String(data.description) : null,
        triggerType: (data.triggerType as WorkflowTriggerType) ?? 'MANUAL',
        triggerEvent: data.triggerEvent ? String(data.triggerEvent) : null,
        createdBy: userId,
      },
    });

    if (Array.isArray(data.steps)) {
      for (let i = 0; i < data.steps.length; i++) {
        const step = data.steps[i] as Record<string, unknown>;
        await prisma.workflowStep.create({
          data: {
            organizationId: orgId,
            workflowId: workflow.id,
            name: String(step.name),
            type: (step.type as WorkflowStepType) ?? 'APPROVAL',
            order: i + 1,
            assigneeRole: step.assigneeRole ? String(step.assigneeRole) : null,
            assigneeId: step.assigneeId ? String(step.assigneeId) : null,
            conditions: step.conditions as Prisma.InputJsonValue ?? null,
            config: step.config as Prisma.InputJsonValue ?? null,
          },
        });
      }
    }

    return this.getById(orgId, workflow.id);
  }

  async update(orgId: string, id: string, data: Record<string, unknown>) {
    const workflow = await prisma.workflow.findFirst({ where: { id, organizationId: orgId } });
    if (!workflow) throw new AppError(404, 'Workflow not found');

    const updateData: Prisma.WorkflowUpdateInput = {};
    if (data.name) updateData.name = String(data.name);
    if (data.description !== undefined) updateData.description = data.description ? String(data.description) : null;
    if (data.triggerType) updateData.triggerType = data.triggerType as WorkflowTriggerType;
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

    await prisma.workflow.update({ where: { id }, data: updateData });

    if (Array.isArray(data.steps)) {
      await prisma.workflowStep.deleteMany({ where: { workflowId: id } });
      for (let i = 0; i < data.steps.length; i++) {
        const step = data.steps[i] as Record<string, unknown>;
        await prisma.workflowStep.create({
          data: {
            organizationId: orgId,
            workflowId: id,
            name: String(step.name),
            type: (step.type as WorkflowStepType) ?? 'APPROVAL',
            order: i + 1,
            assigneeRole: step.assigneeRole ? String(step.assigneeRole) : null,
            assigneeId: step.assigneeId ? String(step.assigneeId) : null,
            conditions: step.conditions as Prisma.InputJsonValue ?? null,
            config: step.config as Prisma.InputJsonValue ?? null,
          },
        });
      }
    }

    return this.getById(orgId, id);
  }

  async delete(orgId: string, id: string) {
    const workflow = await prisma.workflow.findFirst({ where: { id, organizationId: orgId } });
    if (!workflow) throw new AppError(404, 'Workflow not found');

    const activeInstances = await prisma.workflowInstance.count({
      where: { workflowId: id, status: { in: ['PENDING', 'IN_PROGRESS'] } },
    });
    if (activeInstances > 0) throw new AppError(400, 'Cannot delete workflow with active instances');

    await prisma.workflowStep.deleteMany({ where: { workflowId: id } });
    await prisma.workflow.delete({ where: { id } });
    return { success: true };
  }

  async startInstance(orgId: string, workflowId: string, userId: string, taskId?: string) {
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, organizationId: orgId, isActive: true },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
    if (!workflow) throw new AppError(404, 'Active workflow not found');
    if (workflow.steps.length === 0) throw new AppError(400, 'Workflow has no steps');

    const instance = await prisma.workflowInstance.create({
      data: {
        organizationId: orgId,
        workflowId,
        taskId: taskId ?? null,
        status: 'IN_PROGRESS',
        startedBy: userId,
        currentStepId: workflow.steps[0].id,
      },
    });

    const firstStep = workflow.steps[0];
    await prisma.workflowStepInstance.create({
      data: {
        organizationId: orgId,
        instanceId: instance.id,
        stepId: firstStep.id,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });

    if (taskId) {
      await prisma.task.update({
        where: { id: taskId },
        data: { workflowId, approvalStatus: 'PENDING' },
      });
    }

    return this.getInstance(orgId, instance.id);
  }

  async getInstance(orgId: string, instanceId: string) {
    const instance = await prisma.workflowInstance.findFirst({
      where: { id: instanceId, organizationId: orgId },
      include: {
        workflow: true,
        steps: {
          include: { step: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!instance) throw new AppError(404, 'Workflow instance not found');
    return instance;
  }

  async decideStep(orgId: string, instanceId: string, stepInstanceId: string, decision: 'COMPLETED' | 'REJECTED', userId: string, userName: string, comments?: string) {
    const instance = await prisma.workflowInstance.findFirst({
      where: { id: instanceId, organizationId: orgId },
      include: {
        workflow: { include: { steps: { orderBy: { order: 'asc' } } } },
        steps: { include: { step: true } },
      },
    });
    if (!instance) throw new AppError(404, 'Workflow instance not found');

    const stepInstance = instance.steps.find((s) => s.id === stepInstanceId);
    if (!stepInstance) throw new AppError(404, 'Step instance not found');

    await prisma.workflowStepInstance.update({
      where: { id: stepInstanceId },
      data: {
        status: decision,
        comments: comments ?? null,
        decidedAt: new Date(),
        completedAt: new Date(),
        assigneeId: userId,
        assigneeName: userName,
      },
    });

    if (decision === 'REJECTED') {
      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { status: 'REJECTED', completedAt: new Date() },
      });
      if (instance.taskId) {
        await prisma.task.update({
          where: { id: instance.taskId },
          data: { approvalStatus: 'REJECTED' },
        });
      }
      return this.getInstance(orgId, instanceId);
    }

    const currentStepIndex = instance.steps.findIndex((s) => s.id === stepInstanceId);
    const nextStepIndex = currentStepIndex + 1;

    if (nextStepIndex >= instance.steps.length) {
      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      if (instance.taskId) {
        await prisma.task.update({
          where: { id: instance.taskId },
          data: { approvalStatus: 'APPROVED', status: 'IN_PROGRESS' },
        });
      }
    } else {
      const nextStep = instance.steps[nextStepIndex];
      await prisma.workflowStepInstance.update({
        where: { id: nextStep.id },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
      });
      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { currentStepId: nextStep.stepId },
      });
    }

    return this.getInstance(orgId, instanceId);
  }

  async listInstances(orgId: string, filters: Record<string, string | undefined>) {
    const where: Prisma.WorkflowInstanceWhereInput = { organizationId: orgId };
    if (filters.status) where.status = filters.status as WorkflowInstanceStatus;
    if (filters.workflowId) where.workflowId = filters.workflowId;

    const instances = await prisma.workflowInstance.findMany({
      where,
      include: {
        workflow: { select: { name: true } },
        steps: {
          include: { step: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: parseInt(filters.limit ?? '20', 10),
    });

    return instances.map((i) => ({
      id: i.id,
      workflowId: i.workflowId,
      workflowName: i.workflow.name,
      taskId: i.taskId,
      status: i.status,
      startedBy: i.startedBy,
      startedAt: i.startedAt,
      completedAt: i.completedAt,
      steps: i.steps.map((s) => ({
        id: s.id,
        stepName: s.step.name,
        status: s.status,
        assigneeName: s.assigneeName,
        decidedAt: s.decidedAt,
      })),
    }));
  }

  async getTemplates() {
    return WORKFLOW_TEMPLATES.map((t, idx) => ({
      id: `template-${idx}`,
      name: t.name,
      description: t.description,
      category: t.category,
      steps: t.steps,
    }));
  }

  async createFromTemplate(orgId: string, userId: string, templateId: string) {
    const idx = parseInt(templateId.replace('template-', ''), 10);
    const template = WORKFLOW_TEMPLATES[idx];
    if (!template) throw new AppError(404, 'Template not found');

    return this.create(orgId, userId, {
      name: template.name,
      description: template.description,
      steps: template.steps.map((s) => ({
        name: s.name,
        type: s.type,
      })),
    });
  }
}

export const workflowService = new WorkflowService();
