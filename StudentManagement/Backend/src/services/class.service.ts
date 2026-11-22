import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { settingsService } from './settings.service';
import { parentService } from './parent.service';
import { purgeTimetableClass } from '../clients/timetable.client';

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

  async setStudentAccess(id: string, organizationId: string, canEditStudents: boolean) {
    const existing = await prisma.class.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Class not found');
    return prisma.class.update({
      where: { id },
      data: { headTeacherCanEditStudents: canEditStudents },
      include: { grade: true, combination: true },
    });
  }

  private async assertClassTeacherAccess(
    classId: string,
    organizationId: string,
    teacher: { userId?: string | null; email?: string | null }
  ) {
    const cls = await prisma.class.findFirst({ where: { id: classId, organizationId } });
    if (!cls) throw new AppError(404, 'Class not found');
    const userId = teacher.userId?.trim();
    const email = teacher.email?.trim().toLowerCase();
    const isHead =
      (!!userId && cls.headTeacherUserId === userId) ||
      (!!email && (cls.headTeacherEmail ?? '').trim().toLowerCase() === email);
    if (!isHead) throw new AppError(403, 'You are not the class teacher for this class');
    if (!cls.headTeacherCanEditStudents) {
      throw new AppError(403, 'Student information access has been turned off for this class by the school');
    }
    return cls;
  }

  async authorizeClassTeacherStudentEdit(
    classId: string,
    organizationId: string,
    teacher: { userId?: string | null; email?: string | null }
  ) {
    return this.assertClassTeacherAccess(classId, organizationId, teacher);
  }

  async listStudentsForClassTeacher(
    classId: string,
    organizationId: string,
    teacher: { userId?: string | null; email?: string | null }
  ) {
    await this.assertClassTeacherAccess(classId, organizationId, teacher);
    const { studentService } = await import('./student.service');
    return studentService.list(organizationId, { classId, status: 'ACTIVE' });
  }

  async updateStudentForClassTeacher(
    studentId: string,
    organizationId: string,
    teacher: { userId?: string | null; email?: string | null },
    data: Record<string, unknown>
  ) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId, organizationId, isCurrent: true, status: 'ACTIVE' },
      select: { classId: true },
    });
    if (!enrollment) throw new AppError(404, 'Student has no current class');
    await this.assertClassTeacherAccess(enrollment.classId, organizationId, teacher);
    if (Array.isArray(data.parents)) {
      const parents = data.parents as { parentId?: unknown; role?: unknown }[];
      const validRoles = new Set(['FATHER', 'MOTHER', 'GUARDIAN']);
      if (parents.some((parent) => typeof parent.parentId !== 'string' || !validRoles.has(String(parent.role)))) {
        throw new AppError(400, 'Parent links must include a valid parent and role');
      }
      const parentIds = [...new Set(parents.map((parent) => String(parent.parentId)))];
      const matches = await prisma.parent.count({
        where: { organizationId, id: { in: parentIds } },
      });
      if (matches !== parentIds.length) {
        throw new AppError(400, 'One or more selected parents are not in this school');
      }
      if (parents.length !== parentIds.length) {
        throw new AppError(400, 'A parent can only be linked once to this student');
      }
    }
    const { studentService } = await import('./student.service');
    return studentService.update(studentId, organizationId, data as any);
  }

  async updateLinkedParentForClassTeacher(
    studentId: string,
    parentId: string,
    organizationId: string,
    teacher: { userId?: string | null; email?: string | null },
    data: {
      firstName: string;
      lastName: string;
      phone?: string;
      email?: string;
      nationalId?: string;
      occupation?: string;
      address?: string;
    }
  ) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId, organizationId, isCurrent: true, status: 'ACTIVE' },
      select: { classId: true },
    });
    if (!enrollment) throw new AppError(404, 'Student has no current class');
    await this.assertClassTeacherAccess(enrollment.classId, organizationId, teacher);
    const link = await prisma.studentParent.findFirst({
      where: { organizationId, studentId, parentId },
      select: { id: true },
    });
    if (!link) throw new AppError(404, 'Parent is not linked to this student');
    return parentService.update(parentId, organizationId, data);
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
    const label = [existing.name, existing.stream].filter(Boolean).join(' ').trim();
    if (activeCount > 0) {
      throw new AppError(
        400,
        `Cannot delete class "${label}" — ${activeCount} student${activeCount === 1 ? ' is' : 's are'} still enrolled. Reassign or remove them first.`
      );
    }

    // Keep Timetable in sync: remove class timetable/config data before deleting the class record.
    const purge = await purgeTimetableClass(organizationId, label || existing.name);
    if (!purge.ok) {
      throw new AppError(
        502,
        `Class was not deleted because Timetable could not be updated. ${purge.message || 'Please try again.'}`
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
