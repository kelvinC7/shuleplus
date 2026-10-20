import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class TimeTrackingService {
  async startTimer(orgId: string, taskId: string, userId: string, userName: string) {
    const running = await prisma.timeEntry.findFirst({
      where: { userId, endTime: null },
    });
    if (running) throw new AppError(400, 'You already have a running timer. Stop it first.');

    const task = await prisma.task.findFirst({ where: { id: taskId, organizationId: orgId, deletedAt: null } });
    if (!task) throw new AppError(404, 'Task not found');

    return prisma.timeEntry.create({
      data: {
        organizationId: orgId,
        taskId,
        userId,
        userName,
        entryType: 'TIMER',
        startTime: new Date(),
      },
    });
  }

  async stopTimer(orgId: string, entryId: string, userId: string) {
    const entry = await prisma.timeEntry.findFirst({
      where: { id: entryId, userId, endTime: null },
    });
    if (!entry) throw new AppError(404, 'No active timer found');

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - entry.startTime.getTime()) / 1000);

    const updated = await prisma.timeEntry.update({
      where: { id: entryId },
      data: { endTime, duration },
    });

    const totalSeconds = await this.getTotalTimeForTask(orgId, entry.taskId);
    await prisma.task.update({
      where: { id: entry.taskId },
      data: { actualHours: totalSeconds / 3600 },
    });

    return updated;
  }

  async addManualEntry(orgId: string, taskId: string, userId: string, userName: string, data: Record<string, unknown>) {
    const task = await prisma.task.findFirst({ where: { id: taskId, organizationId: orgId, deletedAt: null } });
    if (!task) throw new AppError(404, 'Task not found');

    const entry = await prisma.timeEntry.create({
      data: {
        organizationId: orgId,
        taskId,
        userId,
        userName,
        entryType: 'MANUAL',
        startTime: new Date(String(data.startTime)),
        endTime: data.endTime ? new Date(String(data.endTime)) : null,
        duration: Number(data.duration) ?? 0,
        description: data.description ? String(data.description) : null,
        isBillable: Boolean(data.isBillable),
      },
    });

    const totalSeconds = await this.getTotalTimeForTask(orgId, taskId);
    await prisma.task.update({
      where: { id: taskId },
      data: { actualHours: totalSeconds / 3600 },
    });

    return entry;
  }

  async getTaskTimeEntries(orgId: string, taskId: string) {
    return prisma.timeEntry.findMany({
      where: { taskId, organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserTimeSummary(orgId: string, userId: string, startDate?: string, endDate?: string) {
    const where: Prisma.TimeEntryWhereInput = {
      organizationId: orgId,
      userId,
      endTime: { not: null },
    };
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) (where.startTime as any).gte = new Date(startDate);
      if (endDate) (where.startTime as any).lte = new Date(endDate);
    }

    const entries = await prisma.timeEntry.findMany({ where });
    const totalSeconds = entries.reduce((sum, e) => sum + e.duration, 0);
    const billableSeconds = entries.filter((e) => e.isBillable).reduce((sum, e) => sum + e.duration, 0);

    return {
      totalEntries: entries.length,
      totalHours: Math.round((totalSeconds / 3600) * 10) / 10,
      billableHours: Math.round((billableSeconds / 3600) * 10) / 10,
      nonBillableHours: Math.round(((totalSeconds - billableSeconds) / 3600) * 10) / 10,
    };
  }

  async getRunningTimer(userId: string) {
    const entry = await prisma.timeEntry.findFirst({
      where: { userId, endTime: null },
      include: { task: { select: { id: true, title: true } } },
    });
    if (!entry) return null;
    return {
      id: entry.id,
      taskId: entry.taskId,
      taskTitle: entry.task.title,
      startTime: entry.startTime,
      elapsedSeconds: Math.floor((Date.now() - entry.startTime.getTime()) / 1000),
    };
  }

  private async getTotalTimeForTask(orgId: string, taskId: string): Promise<number> {
    const entries = await prisma.timeEntry.findMany({
      where: { taskId, organizationId: orgId, endTime: { not: null } },
    });
    return entries.reduce((sum, e) => sum + e.duration, 0);
  }
}

export const timeTrackingService = new TimeTrackingService();
