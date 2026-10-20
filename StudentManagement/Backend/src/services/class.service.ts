import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { settingsService } from './settings.service';

function normalizeYear(year: string): string {
  return year.replace(/\s/g, '').replace(/–/g, '-');
}

const GRADE_ORDER: Record<string, number> = {
  N1: 1, N2: 2, N3: 3,
  P1: 4, P2: 5, P3: 6, P4: 7, P5: 8, P6: 9,
  S1: 10, S2: 11, S3: 12, S4: 13, S5: 14, S6: 15,
};

function parseSortOrder(name: string): number {
  return GRADE_ORDER[name.toUpperCase()] ?? 99;
}

function inferEducationLevel(name: string): 'NURSERY' | 'PRIMARY' | 'SECONDARY' | 'TVET' {
  const normalized = name.trim().toUpperCase();
  if (/^(N[1-3]|BABY|NURSERY)/.test(normalized) || /^N\d/.test(normalized)) return 'NURSERY';
  if (/^(L[1-5]|Y[1-3]|TVET)/.test(normalized)) return 'TVET';
  if (/^S[1-6]/.test(normalized)) return 'SECONDARY';
  if (/^P[1-6]/.test(normalized)) return 'PRIMARY';
  if (/nurs|baby/i.test(name)) return 'NURSERY';
  return 'PRIMARY';
}

export class ClassService {
  async create(
    organizationId: string,
    data: {
      name: string;
      stream?: string;
      category?: string;
      gradeId?: string;
      combinationId?: string;
    }
  ) {
    const existing = await prisma.class.findFirst({
      where: {
        organizationId,
        name: data.name,
        combinationId: data.combinationId ?? null,
        stream: data.stream ?? null,
      },
    });
    if (existing) throw new AppError(409, 'Class with this name, combination and stream already exists');

    return prisma.class.create({
      data: {
        organizationId,
        name: data.name,
        stream: data.stream,
        category: data.category ?? inferEducationLevel(data.name),
        gradeId: data.gradeId,
        combinationId: data.combinationId,
        sortOrder: parseSortOrder(data.name),
      },
      include: { grade: true, combination: true },
    });
  }

  async list(
    organizationId: string,
    filters?: { headTeacherUserId?: string; headTeacherUserIds?: string[]; headTeacherEmail?: string }
  ) {
    const email = filters?.headTeacherEmail?.trim().toLowerCase();
    const ids = [
      ...new Set(
        [filters?.headTeacherUserId, ...(filters?.headTeacherUserIds ?? [])].filter(
          (id): id is string => Boolean(id?.trim())
        )
      ),
    ];
    const orConditions: Array<Record<string, unknown>> = [];
    for (const id of ids) {
      orConditions.push({ headTeacherUserId: id });
    }
    if (email) {
      orConditions.push({ headTeacherEmail: { equals: email, mode: 'insensitive' } });
    }

    return prisma.class.findMany({
      where: {
        organizationId,
        ...(orConditions.length ? { OR: orConditions } : {}),
      },
      include: { grade: true, combination: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }, { stream: 'asc' }],
    });
  }

  async assignHeadTeacher(
    id: string,
    organizationId: string,
    data: {
      headTeacherUserId?: string | null;
      headTeacherRefId?: string | null;
      headTeacherName?: string | null;
      headTeacherEmail?: string | null;
      headTeacherSource?: string | null;
    }
  ) {
    const existing = await prisma.class.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Class not found');

    const clearing = !data.headTeacherName?.trim();
    if (clearing) {
      return prisma.class.update({
        where: { id },
        data: {
          headTeacherUserId: null,
          headTeacherRefId: null,
          headTeacherName: null,
          headTeacherEmail: null,
          headTeacherSource: null,
        },
        include: { grade: true, combination: true },
      });
    }

    return prisma.class.update({
      where: { id },
      data: {
        headTeacherUserId: data.headTeacherUserId ?? null,
        headTeacherRefId: data.headTeacherRefId ?? null,
        headTeacherName: data.headTeacherName?.trim() ?? null,
        headTeacherEmail: data.headTeacherEmail?.trim() ?? null,
        headTeacherSource: data.headTeacherSource ?? 'MANUAL',
      },
      include: { grade: true, combination: true },
    });
  }

  async getById(id: string, organizationId: string, academicYear?: string) {
    const settings = await settingsService.getAcademic(organizationId).catch(() => null);
    const isCurrentYear =
      !!academicYear &&
      !!settings?.currentAcademicYear &&
      normalizeYear(academicYear) === normalizeYear(settings.currentAcademicYear);

    const enrollmentWhere: { isCurrent?: boolean; academicYear?: string; status: 'ACTIVE' } = {
      status: 'ACTIVE',
    };
    if (academicYear && !isCurrentYear) {
      enrollmentWhere.academicYear = academicYear;
    } else {
      enrollmentWhere.isCurrent = true;
    }

    const cls = await prisma.class.findFirst({
      where: { id, organizationId },
      include: {
        grade: true,
        combination: true,
        enrollments: {
          where: enrollmentWhere,
          include: { student: true },
        },
      },
    });
    if (!cls) throw new AppError(404, 'Class not found');
    return cls;
  }

  async update(
    id: string,
    organizationId: string,
    data: { name?: string; stream?: string; category?: string; gradeId?: string; combinationId?: string }
  ) {
    const existing = await prisma.class.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new AppError(404, 'Class not found');

    const updateData: any = {};
    if (data.name !== undefined) {
      updateData.name = data.name;
      updateData.sortOrder = parseSortOrder(data.name);
    }
    if (data.stream !== undefined) updateData.stream = data.stream;
    if (data.category !== undefined) updateData.category = data.category;
    else if (data.name !== undefined && !existing.category) {
      updateData.category = inferEducationLevel(data.name);
    }
    if (data.gradeId !== undefined) updateData.gradeId = data.gradeId;
    if (data.combinationId !== undefined) updateData.combinationId = data.combinationId;

    return prisma.class.update({
      where: { id },
      data: updateData,
      include: { grade: true, combination: true },
    });
  }

  async delete(id: string, organizationId: string) {
    const existing = await prisma.class.findFirst({
      where: { id, organizationId },
      include: {
        enrollments: { where: { isCurrent: true }, select: { id: true } },
      },
    });
    if (!existing) throw new AppError(404, 'Class not found');

    const activeCount = existing.enrollments.length;
    if (activeCount > 0) {
      const label = [existing.name, existing.stream].filter(Boolean).join(' ');
      throw new AppError(
        400,
        `Cannot delete class "${label}" — ${activeCount} student${activeCount === 1 ? ' is' : 's are'} still enrolled. Reassign or remove them first.`
      );
    }

    await prisma.$transaction(async (tx) => {
      // Clear promotion targets pointing at this class
      await tx.enrollment.updateMany({
        where: { promotedToClassId: id },
        data: { promotedToClassId: null },
      });
      // Remove any historical (non-current) enrollments so FK does not block delete
      await tx.enrollment.deleteMany({ where: { classId: id } });
      // MarkEntry cascades via schema onDelete
      await tx.class.delete({ where: { id } });
    });

    return { message: 'Class deleted' };
  }
}

export const classService = new ClassService();
