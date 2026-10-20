import { AssignmentStatus, Prisma } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { academicYearVariants, prismaStringIn, termVariants } from '../utils/academic-period';
import { resolveTeacherUserIds } from './smart.service';
import { syncCourseDefaultMarksToAcademic } from '../clients/academic-sync.client';

export class AssignmentService {
  async list(organizationId: string, filters: {
    term?: string;
    academicYear?: string;
    className?: string;
    teacherUserId?: string;
    teacherName?: string;
    email?: string;
  }) {
    const years = academicYearVariants(filters.academicYear);
    const terms = termVariants(filters.term);
    const teacherIds = filters.teacherUserId
      ? await resolveTeacherUserIds(
          organizationId,
          filters.teacherUserId,
          filters.email,
          filters.teacherName
        )
      : [];
    const nameNeedle = String(filters.teacherName || '')
      .trim()
      .split(/\s+/)
      .sort((a, b) => b.length - a.length)[0];

    const teacherWhere =
      teacherIds.length || (nameNeedle && nameNeedle.length >= 4)
        ? {
            OR: [
              ...(teacherIds.length
                ? [{ teacherUserId: teacherIds.length === 1 ? teacherIds[0]! : { in: teacherIds } }]
                : []),
              ...(nameNeedle && nameNeedle.length >= 4
                ? [{ teacherName: { contains: nameNeedle, mode: 'insensitive' as const } }]
                : []),
            ],
          }
        : {};

    const whereBase = {
      organizationId,
      status: AssignmentStatus.ACTIVE,
      ...(filters.className ? { className: filters.className } : {}),
      ...teacherWhere,
    };

    let rows = await prisma.teacherAssignment.findMany({
      where: {
        ...whereBase,
        ...(terms.length ? { term: prismaStringIn(terms) } : {}),
        ...(years.length ? { academicYear: prismaStringIn(years) } : {}),
      },
      orderBy: [{ className: 'asc' }, { subjectName: 'asc' }],
    });
    if (!rows.length && (terms.length || years.length)) {
      rows = await prisma.teacherAssignment.findMany({
        where: whereBase,
        orderBy: [{ className: 'asc' }, { subjectName: 'asc' }],
      });
    }
    return rows;
  }

  async overview(organizationId: string, term: string, academicYear: string) {
    const assignments = await this.list(organizationId, { term, academicYear });
    const byClass = new Map<string, { totalPeriods: number; subjects: number }>();

    for (const a of assignments) {
      const current = byClass.get(a.className) ?? { totalPeriods: 0, subjects: 0 };
      current.totalPeriods += a.periodsPerWeek;
      current.subjects += 1;
      byClass.set(a.className, current);
    }

    return {
      totalAssignments: assignments.length,
      totalPeriods: assignments.reduce((sum, a) => sum + a.periodsPerWeek, 0),
      classBreakdown: [...byClass.entries()].map(([className, stats]) => ({ className, ...stats })),
      assignments,
    };
  }

  async create(
    organizationId: string,
    data: {
      teacherUserId: string;
      teacherName: string;
      className: string;
      subjectName: string;
      periodsPerWeek: number;
      defaultCourseMarks?: number | null;
      room?: string;
      schedulingOverrides?: Record<string, unknown>;
      term: string;
      academicYear: string;
    }
  ) {
    const { schedulingOverrides, defaultCourseMarks, ...rest } = data;
    const row = await prisma.teacherAssignment.create({
      data: {
        organizationId,
        ...rest,
        defaultCourseMarks: defaultCourseMarks ?? null,
        schedulingOverrides: schedulingOverrides as Prisma.InputJsonValue | undefined,
        status: AssignmentStatus.ACTIVE,
      },
    });
    void syncCourseDefaultMarksToAcademic(organizationId, {
      className: row.className,
      subjectName: row.subjectName,
      academicYear: row.academicYear,
      term: row.term,
      defaultCourseMarks: row.defaultCourseMarks != null ? Number(row.defaultCourseMarks) : null,
    });
    return row;
  }

  async update(
    organizationId: string,
    id: string,
    data: Partial<{
      teacherUserId: string;
      teacherName: string;
      className: string;
      subjectName: string;
      periodsPerWeek: number;
      defaultCourseMarks?: number | null;
      room: string | null;
      schedulingOverrides?: Record<string, unknown>;
      term: string;
      academicYear: string;
    }>
  ) {
    const existing = await prisma.teacherAssignment.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Assignment not found');
    const { schedulingOverrides, defaultCourseMarks, ...rest } = data;
    const row = await prisma.teacherAssignment.update({
      where: { id },
      data: {
        ...rest,
        ...(defaultCourseMarks !== undefined ? { defaultCourseMarks } : {}),
        ...(schedulingOverrides !== undefined
          ? { schedulingOverrides: schedulingOverrides as Prisma.InputJsonValue }
          : {}),
      },
    });
    void syncCourseDefaultMarksToAcademic(organizationId, {
      className: row.className,
      subjectName: row.subjectName,
      academicYear: row.academicYear,
      term: row.term,
      defaultCourseMarks: row.defaultCourseMarks != null ? Number(row.defaultCourseMarks) : null,
    });
    return row;
  }

  async archive(organizationId: string, id: string) {
    const existing = await prisma.teacherAssignment.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Assignment not found');
    return prisma.teacherAssignment.update({
      where: { id },
      data: { status: AssignmentStatus.ARCHIVED },
    });
  }

  async remove(organizationId: string, id: string) {
    const existing = await prisma.teacherAssignment.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Assignment not found');
    await prisma.teacherAssignment.delete({ where: { id } });
    return { deleted: true };
  }

  async bulkCreate(
    organizationId: string,
    rows: Array<{
      teacherUserId: string;
      teacherName: string;
      className: string;
      subjectName: string;
      periodsPerWeek: number;
      room?: string;
      schedulingOverrides?: Record<string, unknown>;
      term: string;
      academicYear: string;
    }>
  ) {
    const created = await prisma.$transaction(
      rows.map((row) => {
        const { schedulingOverrides, ...rest } = row;
        return prisma.teacherAssignment.create({
          data: {
            organizationId,
            ...rest,
            schedulingOverrides: schedulingOverrides as Prisma.InputJsonValue | undefined,
            status: AssignmentStatus.ACTIVE,
          },
        });
      })
    );
    return created;
  }
}

export const assignmentService = new AssignmentService();
