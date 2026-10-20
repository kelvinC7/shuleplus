import { Prisma, TaskStatus, TaskPriority } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class DashboardService {
  async summary(orgId: string) {
    const tenant = await prisma.tenant.findUnique({ where: { organizationId: orgId } });
    if (!tenant) throw new AppError(404, 'Tenant not found');

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalTasks,
      activeTasks,
      completedTasks,
      overdueTasks,
      pendingApprovals,
      tasksByPriority,
      tasksByStatus,
      recentTasks,
      departmentWorkload,
      employeeWorkload,
      workflowStats,
      recentActivity,
    ] = await Promise.all([
      prisma.task.count({
        where: { organizationId: orgId, deletedAt: null },
      }),
      prisma.task.count({
        where: { organizationId: orgId, deletedAt: null, status: { in: ['TODO', 'IN_PROGRESS', 'REVIEW'] } },
      }),
      prisma.task.count({
        where: { organizationId: orgId, deletedAt: null, status: 'DONE' },
      }),
      prisma.task.count({
        where: {
          organizationId: orgId,
          deletedAt: null,
          dueDate: { lt: now },
          status: { notIn: ['DONE', 'CANCELLED'] },
        },
      }),
      prisma.task.count({
        where: { organizationId: orgId, deletedAt: null, approvalStatus: 'PENDING' },
      }),
      this.getTasksByPriority(orgId),
      this.getTasksByStatus(orgId),
      prisma.task.findMany({
        where: { organizationId: orgId, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          assignedToName: true,
          dueDate: true,
          progress: true,
          createdAt: true,
        },
      }),
      this.getDepartmentWorkload(orgId),
      this.getEmployeeWorkload(orgId),
      this.getWorkflowStats(orgId),
      prisma.activityLog.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
    ]);

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const avgCompletionTime = await this.getAverageCompletionTime(orgId);
    const slaCompliance = await this.getSLACompliance(orgId);
    const bottleneckWorkflows = await this.getBottleneckWorkflows(orgId);
    const dailyActivity = await this.getDailyActivityTimeline(orgId);

    return {
      organizationId: orgId,
      organizationName: tenant.organizationName,
      status: tenant.status,
      kpis: {
        totalTasks,
        activeTasks,
        completedTasks,
        overdueTasks,
        pendingApprovals,
        completionRate,
        avgCompletionTime,
        slaCompliance,
      },
      tasksByPriority,
      tasksByStatus,
      recentTasks,
      departmentWorkload,
      employeeWorkload,
      workflowStats,
      bottleneckWorkflows,
      dailyActivity,
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        userId: a.userId,
        userName: a.userName,
        entityType: a.entityType,
        entityId: a.entityId,
        action: a.action,
        details: a.details,
        createdAt: a.createdAt,
      })),
    };
  }

  private async getTasksByPriority(orgId: string) {
    const counts = await prisma.task.groupBy({
      by: ['priority'],
      where: { organizationId: orgId, deletedAt: null },
      _count: true,
    });
    const result: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    for (const c of counts) {
      result[c.priority] = c._count;
    }
    return result;
  }

  private async getTasksByStatus(orgId: string) {
    const counts = await prisma.task.groupBy({
      by: ['status'],
      where: { organizationId: orgId, deletedAt: null },
      _count: true,
    });
    const result: Record<string, number> = { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0, CANCELLED: 0 };
    for (const c of counts) {
      result[c.status] = c._count;
    }
    return result;
  }

  private async getDepartmentWorkload(orgId: string) {
    const departments = await prisma.department.findMany({
      where: { organizationId: orgId },
    });
    const result = [];
    for (const dept of departments) {
      const taskCount = await prisma.task.count({
        where: {
          organizationId: orgId,
          deletedAt: null,
          departmentId: dept.id,
          status: { notIn: ['DONE', 'CANCELLED'] },
        },
      });
      const completedCount = await prisma.task.count({
        where: {
          organizationId: orgId,
          deletedAt: null,
          departmentId: dept.id,
          status: 'DONE',
        },
      });
      result.push({
        departmentId: dept.id,
        departmentName: dept.name,
        activeTasks: taskCount,
        completedTasks: completedCount,
        totalTasks: taskCount + completedCount,
      });
    }
    return result;
  }

  private async getEmployeeWorkload(orgId: string) {
    const workload = await prisma.task.groupBy({
      by: ['assignedToId', 'assignedToName'],
      where: {
        organizationId: orgId,
        deletedAt: null,
        assignedToId: { not: null },
        status: { notIn: ['DONE', 'CANCELLED'] },
      },
      _count: true,
    });
    return workload
      .filter((w) => w.assignedToId)
      .map((w) => ({
        userId: w.assignedToId!,
        userName: w.assignedToName ?? 'Unknown',
        activeTasks: w._count,
      }))
      .sort((a, b) => b.activeTasks - a.activeTasks)
      .slice(0, 10);
  }

  private async getWorkflowStats(orgId: string) {
    const [totalWorkflows, activeInstances, completedInstances, failedInstances] = await Promise.all([
      prisma.workflow.count({ where: { organizationId: orgId, isActive: true } }),
      prisma.workflowInstance.count({
        where: { organizationId: orgId, status: 'IN_PROGRESS' },
      }),
      prisma.workflowInstance.count({
        where: { organizationId: orgId, status: 'COMPLETED' },
      }),
      prisma.workflowInstance.count({
        where: { organizationId: orgId, status: 'FAILED' },
      }),
    ]);

    const totalInstances = activeInstances + completedInstances + failedInstances;
    const executionRate = totalInstances > 0 ? Math.round((completedInstances / totalInstances) * 100) : 0;

    return {
      totalWorkflows,
      activeInstances,
      completedInstances,
      failedInstances,
      executionRate,
    };
  }

  private async getAverageCompletionTime(orgId: string): Promise<number> {
    const completedTasks = await prisma.task.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        status: 'DONE',
        completedAt: { not: null },
      },
      select: { createdAt: true, completedAt: true },
      take: 100,
    });

    if (completedTasks.length === 0) return 0;

    const totalHours = completedTasks.reduce((sum, t) => {
      const diff = t.completedAt!.getTime() - t.createdAt.getTime();
      return sum + diff / (1000 * 60 * 60);
    }, 0);

    return Math.round((totalHours / completedTasks.length) * 10) / 10;
  }

  private async getSLACompliance(orgId: string): Promise<number> {
    const totalTasks = await prisma.task.count({
      where: {
        organizationId: orgId,
        deletedAt: null,
        dueDate: { not: null },
        status: 'DONE',
      },
    });
    if (totalTasks === 0) return 100;

    const onTimeTasks = await prisma.task.count({
      where: {
        organizationId: orgId,
        deletedAt: null,
        dueDate: { not: null },
        status: 'DONE',
        completedAt: { not: null },
      },
    });

    return Math.round((onTimeTasks / totalTasks) * 100);
  }

  private async getBottleneckWorkflows(orgId: string) {
    const instances = await prisma.workflowInstance.findMany({
      where: {
        organizationId: orgId,
        status: 'IN_PROGRESS',
      },
      include: {
        workflow: true,
        steps: {
          where: { status: 'PENDING' },
          take: 1,
        },
      },
      take: 10,
    });

    return instances
      .filter((i) => i.steps.length > 0)
      .map((i) => ({
        instanceId: i.id,
        workflowName: i.workflow.name,
        currentStep: i.steps[0]?.name ?? 'Unknown',
        assignee: i.steps[0]?.assigneeName ?? 'Unassigned',
        startedAt: i.startedAt,
        daysInQueue: Math.floor((Date.now() - i.startedAt.getTime()) / (1000 * 60 * 60 * 24)),
      }));
  }

  private async getDailyActivityTimeline(orgId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const tasks = await prisma.task.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true, status: true },
    });

    const dailyMap: Record<string, { created: number; completed: number }> = {};

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      dailyMap[key] = { created: 0, completed: 0 };
    }

    for (const t of tasks) {
      const key = t.createdAt.toISOString().split('T')[0];
      if (dailyMap[key]) dailyMap[key].created++;
    }

    const completedTasks = await prisma.task.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        completedAt: { gte: thirtyDaysAgo },
      },
      select: { completedAt: true },
    });

    for (const t of completedTasks) {
      if (t.completedAt) {
        const key = t.completedAt.toISOString().split('T')[0];
        if (dailyMap[key]) dailyMap[key].completed++;
      }
    }

    return Object.entries(dailyMap).map(([date, counts]) => ({
      date,
      ...counts,
    }));
  }
}

export const dashboardService = new DashboardService();
