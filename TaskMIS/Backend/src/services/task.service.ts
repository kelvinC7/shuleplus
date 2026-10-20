import { Prisma, TaskStatus, TaskPriority, ApprovalStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class TaskService {
  async list(orgId: string, filters: Record<string, string | undefined>) {
    const where: Prisma.TaskWhereInput = {
      organizationId: orgId,
      deletedAt: null,
      parentTaskId: null,
    };

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { assignedToName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.status) where.status = filters.status as TaskStatus;
    if (filters.priority) where.priority = filters.priority as TaskPriority;
    if (filters.category) where.category = filters.category;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.approvalStatus) where.approvalStatus = filters.approvalStatus as ApprovalStatus;
    if (filters.tag) where.tags = { has: filters.tag };

    if (filters.dueBefore) {
      where.dueDate = { ...where.dueDate as any, lt: new Date(filters.dueBefore) };
    }
    if (filters.dueAfter) {
      where.dueDate = { ...where.dueDate as any, gte: new Date(filters.dueAfter) };
    }
    if (filters.createdById) where.createdById = filters.createdById;

    const page = Math.max(1, parseInt(filters.page ?? '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(filters.limit ?? '20', 10)));
    const skip = (page - 1) * limit;

    const sortBy = filters.sortBy ?? 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc';

    const [items, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          subtasks: {
            select: { id: true, status: true, progress: true },
          },
          checklistItems: {
            select: { id: true, isCompleted: true },
          },
          _count: {
            select: { comments: true, attachments: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);

    return {
      data: items.map((t) => this.mapTask(t)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(orgId: string, id: string) {
    const task = await prisma.task.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: {
        subtasks: true,
        comments: { orderBy: { createdAt: 'desc' } },
        attachments: true,
        dependencies: { include: { dependsOn: true } },
        dependentOn: { include: { task: true } },
        checklistItems: { orderBy: { order: 'asc' } },
        timeEntries: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!task) throw new AppError(404, 'Task not found');
    return this.mapTaskDetail(task);
  }

  async create(orgId: string, userId: string, userName: string, data: Record<string, unknown>) {
    const task = await prisma.task.create({
      data: {
        organizationId: orgId,
        title: String(data.title),
        description: data.description ? String(data.description) : null,
        category: data.category ? String(data.category) : null,
        priority: (data.priority as TaskPriority) ?? 'MEDIUM',
        status: (data.status as TaskStatus) ?? 'TODO',
        createdById: userId,
        createdByName: userName,
        assignedToId: data.assignedToId ? String(data.assignedToId) : null,
        assignedToName: data.assignedToName ? String(data.assignedToName) : null,
        assignedType: (data.assignedType as any) ?? 'INDIVIDUAL',
        departmentId: data.departmentId ? String(data.departmentId) : null,
        startDate: data.startDate ? new Date(String(data.startDate)) : null,
        dueDate: data.dueDate ? new Date(String(data.dueDate)) : null,
        estimatedHours: data.estimatedHours ? Number(data.estimatedHours) : null,
        tags: Array.isArray(data.tags) ? data.tags as string[] : [],
        parentTaskId: data.parentTaskId ? String(data.parentTaskId) : null,
        workflowId: data.workflowId ? String(data.workflowId) : null,
        isRecurring: Boolean(data.isRecurring),
        recurringConfig: data.recurringConfig as Prisma.InputJsonValue ?? null,
        metadata: (data.metadata as Prisma.InputJsonValue) ?? {},
      },
    });

    if (Array.isArray(data.checklist)) {
      for (let i = 0; i < data.checklist.length; i++) {
        const item = data.checklist[i] as Record<string, unknown>;
        await prisma.checklistItem.create({
          data: {
            organizationId: orgId,
            taskId: task.id,
            title: String(item.title),
            order: i,
          },
        });
      }
    }

    if (Array.isArray(data.dependencies)) {
      for (const depId of data.dependencies as string[]) {
        await prisma.taskDependency.create({
          data: {
            organizationId: orgId,
            taskId: task.id,
            dependsOnId: depId,
          },
        });
      }
    }

    await this.logActivity(orgId, userId, userName, 'task', task.id, 'CREATED', { title: task.title });

    return this.getById(orgId, task.id);
  }

  async update(orgId: string, id: string, userId: string, userName: string, data: Record<string, unknown>) {
    const existing = await prisma.task.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, 'Task not found');

    const updateData: Prisma.TaskUpdateInput = {};
    const fields = [
      'title', 'description', 'category', 'assignedToId', 'assignedToName',
      'departmentId', 'estimatedHours', 'progress',
    ] as const;

    for (const f of fields) {
      if (data[f] !== undefined) {
        (updateData as Record<string, unknown>)[f] = data[f];
      }
    }

    if (data.priority) updateData.priority = data.priority as TaskPriority;
    if (data.status) {
      updateData.status = data.status as TaskStatus;
      if (data.status === 'DONE') {
        updateData.completedAt = new Date();
        updateData.progress = 100;
      }
    }
    if (data.approvalStatus) updateData.approvalStatus = data.approvalStatus as ApprovalStatus;
    if (data.assignedType) updateData.assignedType = data.assignedType as any;
    if (data.startDate) updateData.startDate = new Date(String(data.startDate));
    if (data.dueDate) updateData.dueDate = new Date(String(data.dueDate));
    if (data.tags) updateData.tags = data.tags as string[];
    if (data.metadata) updateData.metadata = data.metadata as Prisma.InputJsonValue;

    await prisma.task.update({ where: { id }, data: updateData });

    if (Array.isArray(data.checklist)) {
      await prisma.checklistItem.deleteMany({ where: { taskId: id } });
      for (let i = 0; i < data.checklist.length; i++) {
        const item = data.checklist[i] as Record<string, unknown>;
        await prisma.checklistItem.create({
          data: {
            organizationId: orgId,
            taskId: id,
            title: String(item.title),
            isCompleted: Boolean(item.isCompleted),
            order: i,
          },
        });
      }
    }

    await this.logActivity(orgId, userId, userName, 'task', id, 'UPDATED', data);

    return this.getById(orgId, id);
  }

  async delete(orgId: string, id: string, userId: string, userName: string) {
    const task = await prisma.task.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!task) throw new AppError(404, 'Task not found');
    await prisma.task.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.logActivity(orgId, userId, userName, 'task', id, 'DELETED', { title: task.title });
    return { success: true };
  }

  async updateStatus(orgId: string, id: string, status: TaskStatus, userId: string, userName: string) {
    const task = await prisma.task.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!task) throw new AppError(404, 'Task not found');

    const updateData: Prisma.TaskUpdateInput = { status };
    if (status === 'DONE') {
      updateData.completedAt = new Date();
      updateData.progress = 100;
    }

    await prisma.task.update({ where: { id }, data: updateData });
    await this.logActivity(orgId, userId, userName, 'task', id, 'STATUS_CHANGED', { from: task.status, to: status });

    return this.getById(orgId, id);
  }

  async board(orgId: string) {
    const statuses: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
    const result: Record<string, any[]> = {};

    for (const status of statuses) {
      const tasks = await prisma.task.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
          parentTaskId: null,
          status,
        },
        include: {
          checklistItems: { select: { id: true, isCompleted: true } },
          _count: { select: { comments: true, subtasks: true } },
        },
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      });
      result[status] = tasks.map((t) => this.mapTask(t));
    }

    return result;
  }

  async getSubtasks(orgId: string, parentId: string) {
    const tasks = await prisma.task.findMany({
      where: { organizationId: orgId, parentTaskId: parentId, deletedAt: null },
      include: {
        checklistItems: true,
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return tasks.map((t) => this.mapTask(t));
  }

  async createSubtask(orgId: string, parentId: string, userId: string, userName: string, data: Record<string, unknown>) {
    const parent = await prisma.task.findFirst({
      where: { id: parentId, organizationId: orgId, deletedAt: null },
    });
    if (!parent) throw new AppError(404, 'Parent task not found');

    const subtask = await prisma.task.create({
      data: {
        organizationId: orgId,
        title: String(data.title),
        description: data.description ? String(data.description) : null,
        priority: (data.priority as TaskPriority) ?? 'MEDIUM',
        status: (data.status as TaskStatus) ?? 'TODO',
        createdById: userId,
        createdByName: userName,
        assignedToId: data.assignedToId ? String(data.assignedToId) : null,
        assignedToName: data.assignedToName ? String(data.assignedToName) : null,
        dueDate: data.dueDate ? new Date(String(data.dueDate)) : null,
        parentTaskId: parentId,
      },
    });

    return this.mapTask(subtask);
  }

  async addComment(orgId: string, taskId: string, userId: string, userName: string, content: string, mentions: string[]) {
    const task = await prisma.task.findFirst({ where: { id: taskId, organizationId: orgId, deletedAt: null } });
    if (!task) throw new AppError(404, 'Task not found');

    const comment = await prisma.taskComment.create({
      data: {
        organizationId: orgId,
        taskId,
        userId,
        userName,
        content,
        mentions,
      },
    });

    await this.logActivity(orgId, userId, userName, 'task', taskId, 'COMMENT_ADDED', { content: content.slice(0, 100) });

    return comment;
  }

  async getComments(orgId: string, taskId: string) {
    return prisma.taskComment.findMany({
      where: { taskId, organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async logActivity(
    orgId: string, userId: string, userName: string,
    entityType: string, entityId: string, action: string, details?: unknown
  ) {
    await prisma.activityLog.create({
      data: {
        organizationId: orgId,
        userId,
        userName,
        entityType,
        entityId,
        action,
        details: details as Prisma.InputJsonValue ?? undefined,
      },
    });
  }

  private mapTask(t: any) {
    const totalChecklist = t.checklistItems?.length ?? 0;
    const completedChecklist = t.checklistItems?.filter((i: any) => i.isCompleted).length ?? 0;
    return {
      id: t.id,
      title: t.title,
      description: t.description,
      category: t.category,
      priority: t.priority,
      status: t.status,
      approvalStatus: t.approvalStatus,
      createdById: t.createdById,
      createdByName: t.createdByName,
      assignedToId: t.assignedToId,
      assignedToName: t.assignedToName,
      assignedType: t.assignedType,
      departmentId: t.departmentId,
      startDate: t.startDate,
      dueDate: t.dueDate,
      completedAt: t.completedAt,
      estimatedHours: t.estimatedHours ? Number(t.estimatedHours) : null,
      actualHours: t.actualHours ? Number(t.actualHours) : null,
      progress: t.progress,
      tags: t.tags,
      parentTaskId: t.parentTaskId,
      workflowId: t.workflowId,
      isRecurring: t.isRecurring,
      subtaskCount: t.subtasks?.length ?? t._count?.subtasks ?? 0,
      completedSubtasks: t.subtasks?.filter((s: any) => s.status === 'DONE').length ?? 0,
      checklistTotal: totalChecklist,
      checklistCompleted: completedChecklist,
      commentCount: t._count?.comments ?? 0,
      attachmentCount: t._count?.attachments ?? 0,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }

  private mapTaskDetail(t: any) {
    const base = this.mapTask(t);
    return {
      ...base,
      subtasks: t.subtasks?.map((s: any) => this.mapTask(s)) ?? [],
      comments: t.comments ?? [],
      attachments: t.attachments ?? [],
      dependencies: t.dependencies?.map((d: any) => ({
        id: d.id,
        taskId: d.taskId,
        dependsOnId: d.dependsOnId,
        dependsOnTitle: d.dependsOn?.title,
      })) ?? [],
      dependentOn: t.dependentOn?.map((d: any) => ({
        id: d.id,
        taskId: d.task.id,
        taskTitle: d.task.title,
        taskStatus: d.task.status,
      })) ?? [],
      checklistItems: t.checklistItems ?? [],
      timeEntries: t.timeEntries ?? [],
    };
  }
}

export const taskService = new TaskService();
