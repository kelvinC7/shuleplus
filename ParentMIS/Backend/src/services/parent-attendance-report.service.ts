import { AppError } from '../middleware/error.middleware';
import { prisma } from '../config/database';
import type { ParentAttendanceReportKind } from '../generated/prisma-client';

function dateOnlyUtc(iso: string): Date {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new AppError(400, 'Invalid date');
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

export class ParentAttendanceReportService {
  async create(input: {
    organizationId: string;
    parentId: string;
    studentId: string;
    date: string;
    kind: ParentAttendanceReportKind;
    reason: string;
    detail?: string | null;
  }) {
    const reason = input.reason?.trim();
    if (!reason || reason.length < 2) throw new AppError(400, 'Please provide a short reason');

    const reportDate = dateOnlyUtc(input.date);
    const today = todayUtc();
    if (reportDate.getTime() > today.getTime()) throw new AppError(400, 'Cannot report for a future date');

    const student = await prisma.student.findFirst({
      where: { id: input.studentId, organizationId: input.organizationId },
      select: { id: true, className: true, firstName: true, lastName: true, shuleCode: true },
    });
    if (!student) throw new AppError(404, 'Student not found');

    const link = await prisma.parentStudentLink.findFirst({
      where: { parentId: input.parentId, studentId: student.id },
    });
    if (!link) throw new AppError(403, 'Student is not linked to this parent');

    const row = await prisma.parentAttendanceReport.create({
      data: {
        organizationId: input.organizationId,
        studentId: student.id,
        parentId: input.parentId,
        reportDate,
        kind: input.kind,
        reason,
        detail: input.detail?.trim() || null,
      },
    });

    return {
      id: row.id,
      date: input.date.slice(0, 10),
      kind: row.kind,
      reason: row.reason,
      detail: row.detail,
      studentName: [student.firstName, student.lastName].filter(Boolean).join(' '),
      className: student.className,
      studentCode: student.shuleCode,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async listForClass(input: {
    organizationId: string;
    className: string;
    from?: string;
    to?: string;
    limit?: number;
  }) {
    const className = input.className.trim();
    if (!className) throw new AppError(400, 'className is required');

    const from = input.from ? dateOnlyUtc(input.from) : addDaysUtc(todayUtc(), -14);
    const to = input.to ? dateOnlyUtc(input.to) : addDaysUtc(todayUtc(), 7);

    const rows = await prisma.parentAttendanceReport.findMany({
      where: {
        organizationId: input.organizationId,
        reportDate: { gte: from, lte: to },
        student: { className: { equals: className, mode: 'insensitive' } },
      },
      orderBy: [{ reportDate: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(input.limit ?? 50, 100),
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            shuleCode: true,
            className: true,
          },
        },
      },
    });

    return {
      items: rows.map((r) => ({
        id: r.id,
        date: r.reportDate.toISOString().slice(0, 10),
        kind: r.kind,
        reason: r.reason,
        detail: r.detail,
        createdAt: r.createdAt.toISOString(),
        studentName: [r.student.firstName, r.student.lastName].filter(Boolean).join(' '),
        studentCode: r.student.shuleCode,
        className: r.student.className,
      })),
    };
  }
}

function addDaysUtc(d: Date, days: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export const parentAttendanceReportService = new ParentAttendanceReportService();
