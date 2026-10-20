import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import type { PlanStatus, Priority, TaskStatus, ApprovalStatus } from '@prisma/client';

export class ActionPlanService {
  async create(orgId: string, data: any, userId?: string) {
    const plan = await prisma.actionPlan.create({
      data: {
        organizationId: orgId,
        title: data.title,
        description: data.description,
        strategicGoalId: data.strategicGoalId,
        objectiveId: data.objectiveId,
        categoryId: data.categoryId,
        department: data.department,
        priority: data.priority ?? 'MEDIUM',
        responsiblePerson: data.responsiblePerson,
        teamMembers: data.teamMembers ?? [],
        startDate: new Date(data.startDate),
        dueDate: new Date(data.dueDate),
        budget: data.budget ?? 0,
        expectedOutcome: data.expectedOutcome,
        status: 'DRAFT',
        periodType: data.periodType,
        periodYear: data.periodYear,
        periodQuarter: data.periodQuarter,
        periodMonth: data.periodMonth,
        periodWeek: data.periodWeek,
        createdBy: userId,
      },
    });

    await this.createAuditLog(orgId, userId, 'CREATE', 'ActionPlan', plan.id, { title: plan.title });
    return plan;
  }

  async update(orgId: string, id: string, data: any, userId?: string) {
    const existing = await this.findById(orgId, id);

    const oldData = { ...existing };
    const plan = await prisma.actionPlan.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        strategicGoalId: data.strategicGoalId,
        objectiveId: data.objectiveId,
        categoryId: data.categoryId,
        department: data.department,
        priority: data.priority,
        responsiblePerson: data.responsiblePerson,
        teamMembers: data.teamMembers,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        budget: data.budget,
        expectedOutcome: data.expectedOutcome,
        status: data.status,
        periodType: data.periodType,
        periodYear: data.periodYear,
        periodQuarter: data.periodQuarter,
        periodMonth: data.periodMonth,
        periodWeek: data.periodWeek,
      },
    });

    if (data.status && data.status !== existing.status) {
      await this.createStatusHistory(orgId, id, existing.status as PlanStatus, data.status as PlanStatus, userId, data.statusReason);
    }

    // Create version snapshot
    await prisma.actionPlanVersion.create({
      data: {
        organizationId: orgId,
        actionPlanId: id,
        version: existing.version + 1,
        data: oldData,
        changedBy: userId,
        changeSummary: data.changeSummary ?? 'Updated',
      },
    });

    await prisma.actionPlan.update({
      where: { id },
      data: { version: existing.version + 1 },
    });

    await this.createAuditLog(orgId, userId, 'UPDATE', 'ActionPlan', id, { changes: data });
    return plan;
  }

  async delete(orgId: string, id: string, userId?: string) {
    const existing = await this.findById(orgId, id);
    await prisma.actionPlan.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.createAuditLog(orgId, userId, 'DELETE', 'ActionPlan', id, { title: existing.title });
  }

  async findById(orgId: string, id: string) {
    const plan = await prisma.actionPlan.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: {
        category: true,
        tasks: { where: { deletedAt: null, parentId: null }, include: { subtasks: { where: { deletedAt: null } }, dependencies: true }, orderBy: { sortOrder: 'asc' } },
        comments: { include: { replies: true }, orderBy: { createdAt: 'desc' } },
        attachments: true,
        milestones: { orderBy: { sortOrder: 'asc' } },
        budgets: true,
        expenses: true,
        risks: true,
        issues: true,
        kpis: true,
        approvals: { orderBy: { level: 'asc' } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
        assignments: { include: { task: true } },
        resourceAllocations: true,
      },
    });
    if (!plan) throw new AppError(404, 'Action plan not found');
    return plan;
  }

  async list(orgId: string, params: {
    status?: string;
    priority?: string;
    categoryId?: string;
    department?: string;
    search?: string;
    onDate?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { organizationId: orgId, deletedAt: null };

    if (params.status) where.status = params.status;
    if (params.priority) where.priority = params.priority;
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.department) where.department = { contains: params.department, mode: 'insensitive' };
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.onDate) {
      const start = new Date(params.onDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(params.onDate);
      end.setHours(23, 59, 59, 999);
      where.dueDate = { gte: start, lte: end };
    } else if (params.dateFrom || params.dateTo) {
      where.dueDate = {};
      if (params.dateFrom) {
        const from = new Date(params.dateFrom);
        from.setHours(0, 0, 0, 0);
        where.dueDate.gte = from;
      }
      if (params.dateTo) {
        const to = new Date(params.dateTo);
        to.setHours(23, 59, 59, 999);
        where.dueDate.lte = to;
      }
    }

    const [data, total] = await Promise.all([
      prisma.actionPlan.findMany({
        where,
        include: {
          category: true,
          tasks: { where: { deletedAt: null, parentId: null } },
          milestones: true,
          budgets: true,
          expenses: true,
          kpis: true,
          risks: true,
          issues: true,
          approvals: { orderBy: { level: 'asc' } },
          attachments: true,
        },
        orderBy: params.sortBy
          ? { [params.sortBy]: params.sortOrder ?? 'desc' }
          : { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.actionPlan.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async submitForApproval(orgId: string, id: string, userId?: string) {
    const plan = await this.findById(orgId, id);
    if (plan.status !== 'DRAFT') throw new AppError(400, 'Only draft plans can be submitted');

    await prisma.actionPlan.update({
      where: { id },
      data: { status: 'SUBMITTED' },
    });

    await this.createStatusHistory(orgId, id, 'DRAFT', 'SUBMITTED', userId, 'Submitted for approval');

    // Create approval chain
    const approvalLevels = [
      { level: 1, role: 'Supervisor' },
      { level: 2, role: 'Department Head' },
      { level: 3, role: 'Director' },
      { level: 4, role: 'CEO' },
    ];

    await prisma.actionPlanApproval.createMany({
      data: approvalLevels.map((l) => ({
        organizationId: orgId,
        actionPlanId: id,
        level: l.level,
        role: l.role,
        status: l.level === 1 ? 'PENDING' : 'PENDING',
      })),
    });

    return plan;
  }

  async approve(orgId: string, id: string, level: number, data: { approverId?: string; approverName?: string; comments?: string; digitalSignature?: string; status: ApprovalStatus }, userId?: string) {
    const plan = await this.findById(orgId, id);

    const approval = await prisma.actionPlanApproval.findFirst({
      where: { actionPlanId: id, level },
    });
    if (!approval) throw new AppError(404, 'Approval level not found');
    if (approval.status !== 'PENDING') throw new AppError(400, 'This level has already been processed');

    await prisma.actionPlanApproval.update({
      where: { id: approval.id },
      data: {
        status: data.status,
        approverId: data.approverId,
        approverName: data.approverName,
        comments: data.comments,
        digitalSignature: data.digitalSignature,
        signedAt: new Date(),
      },
    });

    if (data.status === 'REJECTED') {
      await prisma.actionPlan.update({ where: { id }, data: { status: 'REJECTED' } });
      await this.createStatusHistory(orgId, id, plan.status as PlanStatus, 'REJECTED', userId, data.comments);
    } else if (data.status === 'RETURNED') {
      await prisma.actionPlan.update({ where: { id }, data: { status: 'DRAFT' } });
      await this.createStatusHistory(orgId, id, plan.status as PlanStatus, 'DRAFT', userId, data.comments);
    } else {
      // Check if all levels approved
      const allApprovals = await prisma.actionPlanApproval.findMany({
        where: { actionPlanId: id },
      });
      const allApproved = allApprovals.every((a) => a.status === 'APPROVED');
      if (allApproved) {
        await prisma.actionPlan.update({ where: { id }, data: { status: 'APPROVED' } });
        await this.createStatusHistory(orgId, id, plan.status as PlanStatus, 'APPROVED', userId, 'Fully approved');
      } else {
        await prisma.actionPlan.update({ where: { id }, data: { status: 'PENDING_APPROVAL' } });
        await this.createStatusHistory(orgId, id, plan.status as PlanStatus, 'PENDING_APPROVAL', userId, `Level ${level} approved`);
      }
    }

    await this.createAuditLog(orgId, userId, 'APPROVAL', 'ActionPlan', id, { level, status: data.status });
  }

  // Task management
  async createTask(orgId: string, actionPlanId: string, data: any, userId?: string) {
    await this.findById(orgId, actionPlanId);

    const task = await prisma.actionPlanTask.create({
      data: {
        organizationId: orgId,
        actionPlanId,
        parentId: data.parentId,
        title: data.title,
        description: data.description,
        owner: data.owner,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        estimatedHours: data.estimatedHours,
        status: 'TODO',
        sortOrder: data.sortOrder ?? 0,
        createdBy: userId,
      },
    });

    await this.createAuditLog(orgId, userId, 'CREATE', 'ActionPlanTask', task.id, { title: task.title });
    await this.recalculatePlanProgress(orgId, actionPlanId);
    return task;
  }

  async updateTask(orgId: string, id: string, data: any, userId?: string) {
    const task = await prisma.actionPlanTask.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!task) throw new AppError(404, 'Task not found');

    let progress = data.progress;
    if (data.status === 'COMPLETED') progress = 100;
    else if (data.status === 'TODO' && progress === undefined) progress = 0;
    else if (data.status === 'IN_PROGRESS' && (progress === undefined || progress === 0)) progress = Math.max(Number(task.progress) || 0, 25);

    const updated = await prisma.actionPlanTask.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        owner: data.owner,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        progress,
        status: data.status,
        sortOrder: data.sortOrder,
        estimatedHours: data.estimatedHours,
        actualHours: data.actualHours,
      },
    });

    if (data.status && data.status !== task.status) {
      await this.createAuditLog(orgId, userId, 'UPDATE_STATUS', 'ActionPlanTask', id, { from: task.status, to: data.status });
    }

    await this.recalculatePlanProgress(orgId, task.actionPlanId);

    return updated;
  }

  private async recalculatePlanProgress(orgId: string, actionPlanId: string) {
    const tasks = await prisma.actionPlanTask.findMany({
      where: { actionPlanId, organizationId: orgId, deletedAt: null },
    });
    if (tasks.length === 0) return;

    const avgProgress = Math.round(
      tasks.reduce((sum, t) => sum + (t.status === 'COMPLETED' ? 100 : Number(t.progress || 0)), 0) / tasks.length
    );

    const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;

    await prisma.actionPlan.update({
      where: { id: actionPlanId },
      data: {
        progress: avgProgress,
        ...(completedCount === tasks.length && tasks.length > 0 ? { status: 'COMPLETED' as any } : {}),
      },
    });
  }

  async deleteTask(orgId: string, id: string, userId?: string) {
    const task = await prisma.actionPlanTask.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!task) throw new AppError(404, 'Task not found');

    await prisma.actionPlanTask.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.createAuditLog(orgId, userId, 'DELETE', 'ActionPlanTask', id, {});
    await this.recalculatePlanProgress(orgId, task.actionPlanId);
  }

  async createDependency(orgId: string, data: { taskId: string; dependsOnId: string; type?: string; lagDays?: number }) {
    return prisma.taskDependency.create({
      data: {
        organizationId: orgId,
        taskId: data.taskId,
        dependsOnId: data.dependsOnId,
        type: (data.type as any) ?? 'FINISH_TO_START',
        lagDays: data.lagDays ?? 0,
      },
    });
  }

  async listTasks(orgId: string, actionPlanId?: string, parentId?: string | null) {
    const where: any = { organizationId: orgId, deletedAt: null };
    if (actionPlanId) where.actionPlanId = actionPlanId;
    if (parentId === null) where.parentId = null;
    else if (parentId) where.parentId = parentId;

    return prisma.actionPlanTask.findMany({
      where,
      include: {
        subtasks: { where: { deletedAt: null }, include: { dependencies: true } },
        dependencies: true,
        dependents: true,
        assignments: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // Comments
  async addComment(orgId: string, actionPlanId: string, data: any, userId?: string) {
    return prisma.actionPlanComment.create({
      data: {
        organizationId: orgId,
        actionPlanId,
        parentId: data.parentId,
        content: data.content,
        author: data.author ?? userId,
        mentions: data.mentions ?? [],
      },
    });
  }

  // Attachments
  async addAttachment(orgId: string, actionPlanId: string, data: any) {
    return prisma.actionPlanAttachment.create({
      data: {
        organizationId: orgId,
        actionPlanId,
        taskId: data.taskId,
        filename: data.filename,
        originalName: data.originalName,
        filePath: data.filePath,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
        category: data.category ?? 'other',
        uploadedBy: data.uploadedBy,
      },
    });
  }

  async verifyAttachment(orgId: string, id: string, verifiedBy: string) {
    const row = await prisma.actionPlanAttachment.findFirst({ where: { id, organizationId: orgId } });
    if (!row) throw new AppError(404, 'Attachment not found');
    return prisma.actionPlanAttachment.update({
      where: { id },
      data: { verifiedBy, verifiedAt: new Date() },
    });
  }

  async deleteAttachment(orgId: string, id: string) {
    const row = await prisma.actionPlanAttachment.findFirst({ where: { id, organizationId: orgId } });
    if (!row) throw new AppError(404, 'Attachment not found');
    await prisma.actionPlanAttachment.delete({ where: { id } });
    return row;
  }

  // Milestones
  async createMilestone(orgId: string, actionPlanId: string, data: any) {
    return prisma.milestone.create({
      data: {
        organizationId: orgId,
        actionPlanId,
        title: data.title,
        description: data.description,
        targetDate: new Date(data.targetDate),
        responsiblePerson: data.responsiblePerson,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async updateMilestone(orgId: string, id: string, data: any) {
    const milestone = await prisma.milestone.findFirst({ where: { id, organizationId: orgId } });
    if (!milestone) throw new AppError(404, 'Milestone not found');

    return prisma.milestone.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
        completedDate: data.completedDate ? new Date(data.completedDate) : undefined,
        responsiblePerson: data.responsiblePerson,
        evidence: data.evidence,
        progress: data.progress,
        isCompleted: data.isCompleted,
      },
    });
  }

  // Budget
  async createOrUpdateBudget(orgId: string, actionPlanId: string, data: any) {
    const existing = await prisma.budget.findFirst({
      where: { organizationId: orgId, actionPlanId, category: data.category ?? 'general' },
    });

    if (existing) {
      return prisma.budget.update({
        where: { id: existing.id },
        data: {
          allocated: data.allocated,
          spent: data.spent,
          committed: data.committed,
        },
      });
    }

    return prisma.budget.create({
      data: {
        organizationId: orgId,
        actionPlanId,
        category: data.category ?? 'general',
        allocated: data.allocated ?? 0,
        spent: data.spent ?? 0,
        committed: data.committed ?? 0,
        fiscalYear: data.fiscalYear,
      },
    });
  }

  // Expenses
  async createExpense(orgId: string, actionPlanId: string, data: any, userId?: string) {
    await this.findById(orgId, actionPlanId);
    const expense = await prisma.expense.create({
      data: {
        organizationId: orgId,
        actionPlanId,
        category: data.category ?? 'other',
        description: data.description,
        amount: data.amount,
        expenseDate: new Date(data.expenseDate ?? Date.now()),
        paidTo: data.paidTo,
        receiptUrl: data.receiptUrl,
        receiptNumber: data.receiptNumber,
        fundingSource: data.fundingSource,
        budgetLineId: data.budgetLineId,
        budgetLineLabel: data.budgetLineLabel,
        createdBy: userId,
      },
    });

    const totalSpent = await prisma.expense.aggregate({
      where: { organizationId: orgId, actionPlanId },
      _sum: { amount: true },
    });
    await prisma.actionPlan.update({
      where: { id: actionPlanId },
      data: { actualCost: totalSpent._sum.amount ?? 0 },
    });

    return expense;
  }

  async listExpenses(orgId: string, actionPlanId: string) {
    return prisma.expense.findMany({
      where: { organizationId: orgId, actionPlanId },
      orderBy: { expenseDate: 'desc' },
    });
  }

  // Risks
  async createRisk(orgId: string, actionPlanId: string, data: any) {
    return prisma.risk.create({
      data: {
        organizationId: orgId,
        actionPlanId,
        title: data.title,
        description: data.description,
        category: data.category,
        impact: data.impact ?? 'MEDIUM',
        probability: data.probability ?? 'MEDIUM',
        mitigation: data.mitigation,
        contingency: data.contingency,
        owner: data.owner,
      },
    });
  }

  async updateRisk(orgId: string, id: string, data: any) {
    const risk = await prisma.risk.findFirst({ where: { id, organizationId: orgId } });
    if (!risk) throw new AppError(404, 'Risk not found');
    return prisma.risk.update({ where: { id }, data });
  }

  // Issues
  async createIssue(orgId: string, actionPlanId: string, data: any, userId?: string) {
    return prisma.issue.create({
      data: {
        organizationId: orgId,
        actionPlanId,
        title: data.title,
        description: data.description,
        severity: data.severity ?? 'MEDIUM',
        priority: data.priority ?? 'MEDIUM',
        assignedTo: data.assignedTo,
        createdBy: userId,
      },
    });
  }

  async resolveIssue(orgId: string, id: string, resolution: string) {
    const issue = await prisma.issue.findFirst({ where: { id, organizationId: orgId } });
    if (!issue) throw new AppError(404, 'Issue not found');
    return prisma.issue.update({
      where: { id },
      data: { status: 'RESOLVED', resolution, resolvedAt: new Date() },
    });
  }

  // KPIs
  async createKpi(orgId: string, actionPlanId: string, data: any) {
    return prisma.kpi.create({
      data: {
        organizationId: orgId,
        actionPlanId,
        name: data.name,
        description: data.description,
        target: data.target,
        unit: data.unit ?? '%',
        currentValue: data.currentValue ?? 0,
      },
    });
  }

  async updateKpiValue(orgId: string, id: string, currentValue: number) {
    const kpi = await prisma.kpi.findFirst({ where: { id, organizationId: orgId } });
    if (!kpi) throw new AppError(404, 'KPI not found');

    const target = Number(kpi.target);
    const prevValue = Number(kpi.currentValue);
    const achievement = target > 0 ? (currentValue / target) * 100 : 0;
    const trend = currentValue > prevValue ? 'up' : currentValue < prevValue ? 'down' : 'stable';

    return prisma.kpi.update({
      where: { id },
      data: {
        currentValue,
        trend,
        measurementDate: new Date(),
      },
    });
  }

  // Categories
  async createCategory(orgId: string, data: any) {
    return prisma.category.create({
      data: {
        organizationId: orgId,
        name: data.name,
        description: data.description,
        color: data.color ?? '#fcb038',
        icon: data.icon,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async listCategories(orgId: string) {
    return prisma.category.findMany({
      where: { organizationId: orgId, isActive: true },
      include: { _count: { select: { actionPlans: true } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async seedDefaultCategories(orgId: string) {
    const defaults = [
      { name: 'Academic', color: '#3b82f6', icon: 'book-open', sortOrder: 1 },
      { name: 'Finance', color: '#22c55e', icon: 'wallet', sortOrder: 2 },
      { name: 'HR', color: '#f59e0b', icon: 'users', sortOrder: 3 },
      { name: 'ICT', color: '#8b5cf6', icon: 'monitor', sortOrder: 4 },
      { name: 'Procurement', color: '#ec4899', icon: 'shopping-cart', sortOrder: 5 },
      { name: 'Sports', color: '#14b8a6', icon: 'trophy', sortOrder: 6 },
      { name: 'Administration', color: '#6b7280', icon: 'building', sortOrder: 7 },
      { name: 'Maintenance', color: '#f97316', icon: 'wrench', sortOrder: 8 },
      { name: 'Security', color: '#ef4444', icon: 'shield', sortOrder: 9 },
      { name: 'Research', color: '#6366f1', icon: 'flask', sortOrder: 10 },
      { name: 'Projects', color: '#06b6d4', icon: 'clipboard', sortOrder: 11 },
      { name: 'Marketing', color: '#d946ef', icon: 'megaphone', sortOrder: 12 },
    ];

    const results = [];
    for (const cat of defaults) {
      const existing = await prisma.category.findFirst({
        where: { organizationId: orgId, name: cat.name },
      });
      if (!existing) {
        results.push(await prisma.category.create({
          data: { organizationId: orgId, ...cat },
        }));
      }
    }
    return results;
  }

  // Templates
  async seedOfficialTemplates(orgId: string) {
    const { ALL_OFFICIAL_TEMPLATES } = await import('../constants/official-templates');
    const expected = ALL_OFFICIAL_TEMPLATES.length;

    const officialCount = await prisma.actionPlanTemplate.count({
      where: { organizationId: orgId, isOfficial: true },
    });
    if (officialCount >= expected) return [];

    const existing = await prisma.actionPlanTemplate.findMany({
      where: { organizationId: orgId, officialSlug: { not: null } },
      select: { officialSlug: true },
    });
    const have = new Set(existing.map((e) => e.officialSlug));

    const results = [];
    for (const def of ALL_OFFICIAL_TEMPLATES) {
      if (have.has(def.slug)) continue;
      results.push(
        await prisma.actionPlanTemplate.create({
          data: {
            organizationId: orgId,
            name: def.name,
            description: def.description,
            type: def.categoryId,
            categoryId: def.categoryId,
            ownership: 'official',
            isOfficial: true,
            isDefault: true,
            officialSlug: def.slug,
            templateData: {
              goals: def.goals,
              objectives: def.objectives,
              suggestedActivities: def.suggestedActivities,
              suggestedKpis: def.suggestedKpis,
              evidenceRequirements: def.evidenceRequirements,
              suggestedTimelineMonths: def.suggestedTimelineMonths,
              budgetCategories: def.budgetCategories,
              strategicPillars: def.strategicPillars,
              schoolTypes: def.schoolTypes,
            } as object,
          },
        })
      );
    }
    if (results.length > 0) {
      console.log(`[Templates] Seeded ${results.length} official templates for org ${orgId}`);
    }
    return results;
  }

  async seedOfficialTemplatesForAllTenants() {
    const tenants = await prisma.tenant.findMany({ select: { organizationId: true } });
    for (const tenant of tenants) {
      await this.seedOfficialTemplates(tenant.organizationId).catch((err) => {
        console.error(`[Templates] Startup seed failed for ${tenant.organizationId}:`, err?.message ?? err);
      });
    }
  }

  async listTemplates(orgId: string, filters?: { categoryId?: string; ownership?: string; search?: string; userId?: string }) {
    await this.seedOfficialTemplates(orgId).catch((err) => {
      console.error('[Templates] Official seed failed:', err);
    });

    const where: any = { organizationId: orgId };
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.ownership === 'personal' && filters.userId) {
      where.ownership = 'personal';
      where.createdBy = filters.userId;
    } else if (filters?.ownership) {
      where.ownership = filters.ownership;
    }
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.actionPlanTemplate.findMany({
      where,
      orderBy: [{ isOfficial: 'desc' }, { categoryId: 'asc' }, { name: 'asc' }],
    });
  }

  async getTemplateCatalog(orgId: string) {
    const { OFFICIAL_TEMPLATE_CATEGORIES } = await import('../constants/official-templates');

    try {
      await this.seedOfficialTemplates(orgId);

      const counts = await prisma.actionPlanTemplate.groupBy({
        by: ['categoryId'],
        where: { organizationId: orgId, categoryId: { not: null } },
        _count: { id: true },
      });
      const countMap = new Map(counts.map((c) => [c.categoryId, c._count.id]));

      const customCounts = await prisma.actionPlanTemplate.groupBy({
        by: ['ownership'],
        where: { organizationId: orgId, isOfficial: false },
        _count: { id: true },
      });
      const schoolCount = customCounts.find((c) => c.ownership === 'school')?._count.id ?? 0;
      const personalCount = customCounts.find((c) => c.ownership === 'personal')?._count.id ?? 0;

      return {
        categories: OFFICIAL_TEMPLATE_CATEGORIES.map((cat) => ({
          id: cat.id,
          label: cat.label,
          icon: cat.icon,
          count: countMap.get(cat.id) ?? cat.templates.length,
        })),
        schoolTemplates: schoolCount,
        personalTemplates: personalCount,
        totalOfficial: OFFICIAL_TEMPLATE_CATEGORIES.reduce((s, c) => s + c.templates.length, 0),
      };
    } catch (err) {
      console.error('[Templates] Catalog DB error (using constants fallback):', err);
      return {
        categories: OFFICIAL_TEMPLATE_CATEGORIES.map((cat) => ({
          id: cat.id,
          label: cat.label,
          icon: cat.icon,
          count: cat.templates.length,
        })),
        schoolTemplates: 0,
        personalTemplates: 0,
        totalOfficial: OFFICIAL_TEMPLATE_CATEGORIES.reduce((s, c) => s + c.templates.length, 0),
      };
    }
  }

  async getTemplateById(orgId: string, id: string) {
    const template = await prisma.actionPlanTemplate.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!template) throw new AppError(404, 'Template not found');
    return template;
  }

  async createTemplate(orgId: string, data: any, userId?: string) {
    const ownership = data.ownership === 'personal' ? 'personal' : 'school';
    return prisma.actionPlanTemplate.create({
      data: {
        organizationId: orgId,
        name: data.name,
        description: data.description,
        type: data.categoryId ?? data.type ?? 'general',
        categoryId: data.categoryId,
        ownership,
        schoolType: data.schoolType,
        templateData: data.templateData ?? {},
        createdBy: userId,
      },
    });
  }

  async updateTemplate(orgId: string, id: string, data: any, userId?: string) {
    const template = await this.getTemplateById(orgId, id);
    if (template.ownership === 'personal' && template.createdBy && template.createdBy !== userId) {
      throw new AppError(403, 'You can only edit your own personal templates');
    }

    const ownership =
      template.isOfficial || template.ownership === 'official'
        ? 'official'
        : data.ownership === 'personal'
          ? 'personal'
          : 'school';

    return prisma.actionPlanTemplate.update({
      where: { id },
      data: {
        name: data.name ?? template.name,
        description: data.description ?? template.description,
        type: data.categoryId ?? data.type ?? template.type,
        categoryId: data.categoryId ?? template.categoryId,
        ownership,
        schoolType: data.schoolType ?? template.schoolType,
        templateData: data.templateData ?? template.templateData,
      },
    });
  }

  async createTemplateFromPlan(orgId: string, planId: string, data: any, userId?: string) {
    const plan = await this.findById(orgId, planId);
    const ownership = data.ownership === 'personal' ? 'personal' : 'school';

    const templateData = {
      goals: data.goals ?? [plan.expectedOutcome ?? plan.title].filter(Boolean),
      objectives: data.objectives ?? (plan.description ? plan.description.split('\n').filter(Boolean) : []),
      suggestedActivities: (plan.tasks ?? []).map((t: any) => ({
        title: t.title,
        defaultSelected: true,
        frequency: t.description?.match(/Frequency: ([^\n]+)/)?.[1],
        verification: t.description?.match(/Verification: ([^\n]+)/)?.[1],
      })),
      suggestedKpis: (plan.kpis ?? []).map((k: any) => ({
        name: k.name,
        baseline: Number(k.currentValue),
        target: Number(k.target),
        unit: k.unit ?? '%',
      })),
      evidenceRequirements: data.evidenceRequirements ?? ['Progress reports', 'Meeting minutes', 'Evidence attachments'],
      suggestedTimelineMonths: data.suggestedTimelineMonths ?? 10,
      budgetCategories: data.budgetCategories ?? ['Materials', 'Training', 'Transport'],
      strategicPillars: data.strategicPillars ?? [],
      schoolTypes: data.schoolTypes ?? ['Primary', 'Secondary'],
      sourcePlanTitle: plan.title,
    };

    return prisma.actionPlanTemplate.create({
      data: {
        organizationId: orgId,
        name: data.name ?? `${plan.title} Template`,
        description: data.description ?? `Saved from action plan: ${plan.title}`,
        type: data.categoryId ?? plan.category?.name ?? 'general',
        categoryId: data.categoryId,
        ownership,
        sourcePlanId: planId,
        schoolType: data.schoolType,
        templateData,
        createdBy: userId,
      },
    });
  }

  async deleteTemplate(orgId: string, id: string, userId?: string) {
    const template = await this.getTemplateById(orgId, id);
    if (template.isOfficial || template.ownership === 'official') {
      throw new AppError(403, 'Official templates cannot be deleted');
    }
    if (template.ownership === 'personal' && template.createdBy && template.createdBy !== userId) {
      throw new AppError(403, 'You can only delete your own personal templates');
    }
    await prisma.actionPlanTemplate.delete({ where: { id } });
  }

  async applyTemplate(orgId: string, templateId: string, data: any, userId?: string) {
    const template = await this.getTemplateById(orgId, templateId);
    const td = (template.templateData ?? {}) as Record<string, any>;

    const selectedActivities: string[] = data.selectedActivities ?? [];
    const allActivities = (td.suggestedActivities ?? []) as { title: string; defaultSelected?: boolean; frequency?: string; verification?: string }[];
    const activitiesToCreate = allActivities.filter(
      (a) => selectedActivities.includes(a.title) || (selectedActivities.length === 0 && a.defaultSelected !== false)
    );

    const academicYear = data.academicYear ?? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    const periodYear = parseInt(String(academicYear).split('-')[0], 10) || new Date().getFullYear();
    const startDate = data.startDate ? new Date(data.startDate) : new Date(periodYear, 0, 1);
    const dueDate = data.dueDate ? new Date(data.dueDate) : new Date(periodYear, 11, 31);

    const goals = (data.selectedGoals ?? td.goals ?? []) as string[];
    const objectives = (data.selectedObjectives ?? td.objectives ?? []) as string[];

    const description = [
      `Academic Year: ${academicYear}`,
      goals.length ? `\nGoals:\n${goals.map((g) => `• ${g}`).join('\n')}` : '',
      objectives.length ? `\nObjectives:\n${objectives.map((o) => `• ${o}`).join('\n')}` : '',
      template.description ? `\n${template.description}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    let categoryId = data.categoryId;
    if (!categoryId && template.categoryId) {
      const cat = await prisma.category.findFirst({
        where: { organizationId: orgId, name: { contains: template.categoryId, mode: 'insensitive' } },
      });
      categoryId = cat?.id;
    }

    const plan = await prisma.actionPlan.create({
      data: {
        organizationId: orgId,
        title: data.title ?? template.name,
        description,
        categoryId,
        department: data.department,
        priority: data.priority ?? 'MEDIUM',
        responsiblePerson: data.responsiblePerson,
        startDate,
        dueDate,
        budget: data.budget ?? 0,
        expectedOutcome: goals[0] ?? template.name,
        status: 'DRAFT',
        periodType: 'ANNUAL',
        periodYear,
        createdBy: userId,
      },
    });

    for (const act of activitiesToCreate) {
      await prisma.actionPlanTask.create({
        data: {
          organizationId: orgId,
          actionPlanId: plan.id,
          title: act.title,
          description: [
            act.frequency && `Frequency: ${act.frequency}`,
            act.verification && `Verification: ${act.verification}`,
          ]
            .filter(Boolean)
            .join('\n'),
          startDate,
          dueDate,
          status: 'TODO',
          createdBy: userId,
        },
      });
    }

    const kpis = (td.suggestedKpis ?? []) as { name: string; baseline?: number; target: number; unit: string }[];
    for (const kpi of kpis) {
      await prisma.kpi.create({
        data: {
          organizationId: orgId,
          actionPlanId: plan.id,
          name: kpi.name,
          target: kpi.target,
          currentValue: kpi.baseline ?? 0,
          unit: kpi.unit ?? '%',
        },
      });
    }

    await this.createAuditLog(orgId, userId, 'CREATE', 'ActionPlan', plan.id, {
      title: plan.title,
      fromTemplate: template.id,
      templateName: template.name,
    });

    return this.findById(orgId, plan.id);
  }

  async getRecommendedTemplates(orgId: string, userId?: string) {
    await this.seedOfficialTemplates(orgId).catch(console.error);
    const { RECOMMENDATION_RULES, OFFICIAL_TEMPLATE_BY_SLUG } = await import('../constants/official-templates');

    const plans = await prisma.actionPlan.findMany({
      where: { organizationId: orgId, deletedAt: null },
      include: { kpis: true, risks: true, issues: true },
    });

    const allKpis = plans.flatMap((p) => p.kpis);
    const recommendations: {
      templateId?: string;
      slug: string;
      name: string;
      categoryId: string;
      metricLabel: string;
      currentValue: number | string;
      targetValue: number | string;
      unit: string;
      severity: 'high' | 'medium' | 'low';
      reason: string;
    }[] = [];

    for (const rule of RECOMMENDATION_RULES) {
      const def = OFFICIAL_TEMPLATE_BY_SLUG.get(rule.slug);
      if (!def) continue;

      const dbTemplate = await prisma.actionPlanTemplate.findFirst({
        where: { organizationId: orgId, officialSlug: rule.slug },
      });

      let current: number | string = rule.defaultCurrent;
      let target: number | string = rule.defaultTarget;
      let matched = false;

      for (const kpi of allKpis) {
        const kName = kpi.name.toLowerCase();
        if (rule.keywords.some((kw) => kName.includes(kw))) {
          current = Number(kpi.currentValue);
          target = Number(kpi.target);
          matched = true;
          break;
        }
      }

      const numCurrent = Number(current);
      const numTarget = Number(target);
      const needsAttention =
        matched
          ? rule.unit === '%'
            ? numCurrent < numTarget
            : numCurrent > numTarget
          : true;

      if (needsAttention) {
        recommendations.push({
          templateId: dbTemplate?.id,
          slug: rule.slug,
          name: def.name,
          categoryId: def.categoryId,
          metricLabel: rule.metricLabel,
          currentValue: current,
          targetValue: target,
          unit: rule.unit,
          severity: rule.severity,
          reason: matched
            ? `Based on your school's ${rule.metricLabel.toLowerCase()} data`
            : `Recommended based on common improvement areas in Rwanda schools`,
        });
      }
    }

    return recommendations.slice(0, 8);
  }

  // Notifications
  async createNotification(orgId: string, data: { userId?: string; title: string; message?: string; type?: string; referenceType?: string; referenceId?: string }) {
    return prisma.notification.create({
      data: {
        organizationId: orgId,
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type ?? 'info',
        referenceType: data.referenceType,
        referenceId: data.referenceId,
      },
    });
  }

  async listNotifications(orgId: string, userId?: string) {
    const where: any = { organizationId: orgId };
    if (userId) where.userId = userId;

    return prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markNotificationRead(orgId: string, id: string) {
    return prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /** Create overdue/at-risk alerts (deduped per reference per day). */
  async syncOverdueNotifications(orgId: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const tasks = await prisma.actionPlanTask.findMany({
      where: { organizationId: orgId, deletedAt: null, status: { not: 'COMPLETED' } },
      include: { actionPlan: { select: { title: true } } },
    });

    let created = 0;
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const overdue = new Date(task.dueDate) < now;
      const daysLeft = (new Date(task.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      const atRisk = !overdue && daysLeft <= 7 && Number(task.progress || 0) < 50;
      if (!overdue && !atRisk) continue;

      const existing = await prisma.notification.findFirst({
        where: {
          organizationId: orgId,
          referenceType: 'task',
          referenceId: task.id,
          createdAt: { gte: startOfDay },
        },
      });
      if (existing) continue;

      const title = overdue ? 'Overdue Activity' : 'Activity At Risk';
      const message = overdue
        ? `"${task.title}" (${task.actionPlan.title}) is overdue — ${Number(task.progress)}% complete.`
        : `"${task.title}" is due in ${Math.ceil(daysLeft)} days and only ${Number(task.progress)}% complete.`;

      await this.createNotification(orgId, {
        title,
        message,
        type: overdue ? 'warning' : 'alert',
        referenceType: 'task',
        referenceId: task.id,
      });
      created++;
    }
    return { created };
  }

  async createPeriodReview(orgId: string, data: any, userId?: string) {
    return prisma.periodReview.create({
      data: {
        organizationId: orgId,
        reviewType: data.reviewType,
        periodYear: data.periodYear,
        periodMonth: data.periodMonth,
        periodQuarter: data.periodQuarter,
        planned: data.planned,
        completed: data.completed,
        delayed: data.delayed,
        reason: data.reason,
        corrective: data.corrective,
        newDeadline: data.newDeadline ? new Date(data.newDeadline) : undefined,
        responsible: data.responsible,
        createdBy: userId,
      },
    });
  }

  async listPeriodReviews(orgId: string, reviewType?: string) {
    return prisma.periodReview.findMany({
      where: { organizationId: orgId, ...(reviewType ? { reviewType } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // Activities (Audit Logs)
  async listActivities(orgId: string, params: { entityType?: string; entityId?: string; limit?: number }) {
    const where: any = { organizationId: orgId };
    if (params.entityType) where.entityType = params.entityType;
    if (params.entityId) where.entityId = params.entityId;

    return prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 100,
    });
  }

  // Recurring Plans
  async createRecurringPlan(orgId: string, data: any, userId?: string) {
    return prisma.recurringPlan.create({
      data: {
        organizationId: orgId,
        title: data.title,
        description: data.description,
        recurrenceType: data.recurrenceType,
        interval: data.interval ?? 1,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        department: data.department,
        responsiblePerson: data.responsiblePerson,
        priority: data.priority ?? 'MEDIUM',
        budget: data.budget,
        createdBy: userId,
      },
    });
  }

  // Resource Allocation
  async createResourceAllocation(orgId: string, actionPlanId: string, data: any) {
    return prisma.resourceAllocation.create({
      data: {
        organizationId: orgId,
        actionPlanId,
        resourceType: data.resourceType,
        resourceName: data.resourceName,
        quantity: data.quantity ?? 1,
        allocatedFrom: new Date(data.allocatedFrom),
        allocatedTo: data.allocatedTo ? new Date(data.allocatedTo) : undefined,
        cost: data.cost,
        notes: data.notes,
      },
    });
  }

  // Meetings
  async createMeeting(orgId: string, data: any, userId?: string) {
    return prisma.meeting.create({
      data: {
        organizationId: orgId,
        actionPlanId: data.actionPlanId,
        title: data.title,
        description: data.description,
        agenda: data.agenda ?? [],
        location: data.location,
        meetingDate: new Date(data.meetingDate),
        startTime: data.startTime,
        endTime: data.endTime,
        participants: data.participants ?? [],
        createdBy: userId,
      },
    });
  }

  async listMeetings(orgId: string, actionPlanId?: string) {
    const where: any = { organizationId: orgId };
    if (actionPlanId) where.actionPlanId = actionPlanId;

    return prisma.meeting.findMany({
      where,
      include: { minutes: true },
      orderBy: { meetingDate: 'desc' },
    });
  }

  async addMeetingMinute(orgId: string, meetingId: string, data: any) {
    return prisma.meetingMinute.create({
      data: {
        organizationId: orgId,
        meetingId,
        content: data.content,
        author: data.author,
        decision: data.decision ?? false,
        actionItem: data.actionItem,
        assignedTo: data.assignedTo,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    });
  }

  // Analytics
  async getDashboardAnalytics(orgId: string) {
    await this.syncOverdueNotifications(orgId);

    const plans = await prisma.actionPlan.findMany({
      where: { organizationId: orgId, deletedAt: null },
      include: {
        category: true,
        tasks: { where: { deletedAt: null } },
        budgets: true,
        milestones: true,
        risks: true,
        kpis: true,
        _count: { select: { comments: true, attachments: true } },
      },
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const total = plans.length;
    const active = plans.filter((p) => p.status === 'IN_PROGRESS').length;
    const completed = plans.filter((p) => p.status === 'COMPLETED').length;
    const inProgress = active;
    const notStarted = plans.filter(
      (p) => p.status === 'DRAFT' || p.status === 'APPROVED' || (Number(p.progress || 0) === 0 && p.status !== 'COMPLETED')
    ).length;
    const delayed = plans.filter((p) => p.status === 'IN_PROGRESS' && new Date(p.dueDate) < now).length;
    const overdue = delayed;
    const cancelled = plans.filter((p) => p.status === 'CANCELLED').length;
    const draft = plans.filter((p) => p.status === 'DRAFT').length;
    const pendingApproval = plans.filter((p) => p.status === 'PENDING_APPROVAL' || p.status === 'SUBMITTED').length;
    const highPriority = plans.filter((p) => p.priority === 'HIGH' || p.priority === 'CRITICAL').length;
    const dueThisMonth = plans.filter(
      (p) => p.status !== 'COMPLETED' && p.status !== 'CANCELLED' && p.dueDate >= monthStart && p.dueDate <= monthEnd
    ).length;

    const totalBudget = plans.reduce((sum, p) => sum + Number(p.budget || 0), 0);
    const totalSpent = plans.reduce((sum, p) => sum + Number(p.actualCost || 0), 0);
    const remainingBudget = Math.max(0, totalBudget - totalSpent);
    const avgProgress = total > 0 ? plans.reduce((sum, p) => sum + Number(p.progress || 0), 0) / total : 0;

    const allTasks = plans.flatMap((p) => p.tasks);
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t) => t.status === 'COMPLETED').length;
    const delayedActivities = allTasks.filter(
      (t) => t.status !== 'COMPLETED' && t.dueDate && new Date(t.dueDate) < now
    );
    const atRiskActivities = allTasks.filter((t) => {
      if (t.status === 'COMPLETED' || !t.dueDate) return false;
      const daysLeft = (new Date(t.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysLeft >= 0 && daysLeft <= 7 && Number(t.progress || 0) < 50;
    });
    const activitiesDueThisMonth = allTasks.filter(
      (t) => t.status !== 'COMPLETED' && t.dueDate && new Date(t.dueDate) >= monthStart && new Date(t.dueDate) <= monthEnd
    ).length;

    const totalObjectives = await prisma.objective.count({ where: { organizationId: orgId } });
    const totalAnnualObjectives = totalObjectives > 0 ? totalObjectives : total;

    // Department performance
    const deptMap = new Map<string, { count: number; progress: number; completed: number }>();
    for (const plan of plans) {
      const dept = plan.department ?? 'Unassigned';
      const existing = deptMap.get(dept) ?? { count: 0, progress: 0, completed: 0 };
      existing.count++;
      existing.progress += Number(plan.progress || 0);
      if (plan.status === 'COMPLETED') existing.completed++;
      deptMap.set(dept, existing);
    }

    const departmentPerformance = Array.from(deptMap.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      averageProgress: data.count > 0 ? Math.round(data.progress / data.count) : 0,
      completed: data.completed,
    }));

    // Priority distribution
    const priorityDist = plans.reduce((acc, p) => {
      const key = p.priority;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc as Record<string, number>;
    }, {} as Record<string, number>);

    // Status distribution
    const statusDist = plans.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1;
      return acc as Record<string, number>;
    }, {} as Record<string, number>);

    // Monthly activity (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyActivity = await prisma.auditLog.groupBy({
      by: ['createdAt'],
      where: {
        organizationId: orgId,
        createdAt: { gte: twelveMonthsAgo },
      },
      _count: { id: true },
    });

    // Upcoming deadlines (next 30 days)
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    const upcomingDeadlines = plans.filter(
      (p) => p.status === 'IN_PROGRESS' && p.dueDate >= now && p.dueDate <= thirtyDays
    );

    // Pillar progress (by strategic category)
    const pillarMap = new Map<string, { count: number; progress: number; completed: number }>();
    for (const plan of plans) {
      const pillar = plan.category?.name ?? 'Uncategorized';
      const existing = pillarMap.get(pillar) ?? { count: 0, progress: 0, completed: 0 };
      existing.count++;
      existing.progress += Number(plan.progress || 0);
      if (plan.status === 'COMPLETED') existing.completed++;
      pillarMap.set(pillar, existing);
    }
    const pillarProgress = Array.from(pillarMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        averageProgress: data.count > 0 ? Math.round(data.progress / data.count) : 0,
        completed: data.completed,
      }))
      .sort((a, b) => b.count - a.count);

    // Monthly implementation (plans completed per month, last 6 months)
    const monthlyImplementation: { month: string; completed: number; created: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      monthlyImplementation.push({
        month: label,
        completed: plans.filter((p) => p.status === 'COMPLETED' && p.updatedAt >= d && p.updatedAt <= end).length,
        created: plans.filter((p) => p.createdAt >= d && p.createdAt <= end).length,
      });
    }

    // Planned vs achieved (KPI rollup)
    const allKpis = plans.flatMap((p) => p.kpis);
    const plannedVsAchieved = allKpis.slice(0, 12).map((k) => {
      const target = Number(k.target);
      const current = Number(k.currentValue);
      const pct = target > 0 ? Math.round((current / target) * 100) : 0;
      return {
        name: k.name,
        target,
        achieved: current,
        performance: pct,
        unit: k.unit ?? '%',
      };
    });

    // Delayed activity alerts
    const delayedActivityAlerts = [...delayedActivities, ...atRiskActivities]
      .slice(0, 10)
      .map((t) => {
        const plan = plans.find((p) => p.id === t.actionPlanId);
        const progress = Number(t.progress || 0);
        const overdue = t.dueDate && new Date(t.dueDate) < now;
        return {
          id: t.id,
          title: t.title,
          planTitle: plan?.title ?? '—',
          dueDate: t.dueDate,
          progress,
          status: overdue ? 'overdue' : 'at_risk',
          owner: t.owner,
        };
      });

    // Recent activities
    const recentActivities = await prisma.auditLog.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Approval queue
    const approvalQueue = await prisma.actionPlanApproval.findMany({
      where: {
        actionPlan: { organizationId: orgId, deletedAt: null },
        status: 'PENDING',
      },
      include: {
        actionPlan: { select: { id: true, title: true, department: true, priority: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Risk heat map
    const riskCounts = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const plan of plans) {
      for (const risk of plan.risks) {
        const key = risk.probability.toLowerCase() as keyof typeof riskCounts;
        if (key in riskCounts) riskCounts[key]++;
      }
    }

    // Budget utilization
    const budgetUtilization = plans
      .filter((p) => Number(p.budget) > 0)
      .map((p) => ({
        title: p.title,
        budget: Number(p.budget),
        spent: Number(p.actualCost),
        utilization: Number(p.budget) > 0 ? (Number(p.actualCost || 0) / Number(p.budget)) * 100 : 0,
      }));

    return {
      total,
      active,
      completed,
      delayed,
      overdue,
      cancelled,
      draft,
      pendingApproval,
      notStarted,
      inProgress,
      highPriority,
      dueThisMonth,
      totalAnnualObjectives,
      totalActivities: totalTasks,
      completedActivities: completedTasks,
      activitiesDueThisMonth,
      totalBudget,
      totalSpent,
      remainingBudget,
      avgProgress: Math.round(avgProgress),
      totalTasks,
      completedTasks,
      pillarProgress,
      monthlyImplementation,
      plannedVsAchieved,
      delayedActivityAlerts,
      upcomingDeadlines: upcomingDeadlines.map((p) => ({
        id: p.id,
        title: p.title,
        dueDate: p.dueDate,
        progress: p.progress,
        priority: p.priority,
      })),
      departmentPerformance,
      priorityDistribution: priorityDist,
      statusDistribution: statusDist,
      recentActivities,
      approvalQueue,
      riskHeatMap: riskCounts,
      budgetUtilization: budgetUtilization.slice(0, 10),
      monthlyActivity,
    };
  }

  // Private helpers
  private async createStatusHistory(orgId: string, planId: string, from: PlanStatus, to: PlanStatus, userId?: string, reason?: string) {
    return prisma.actionPlanStatusHistory.create({
      data: {
        organizationId: orgId,
        actionPlanId: planId,
        fromStatus: from,
        toStatus: to,
        changedBy: userId,
        reason,
      },
    });
  }

  private async createAuditLog(orgId: string, userId: string | undefined, action: string, entityType: string, entityId: string, changes: any) {
    return prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action,
        entityType,
        entityId,
        changes,
      },
    });
  }
}

export const actionPlanService = new ActionPlanService();
