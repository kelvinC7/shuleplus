import { EnrollmentStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class EnrollmentService {
  async enroll(
    organizationId: string,
    userId: string,
    data: {
      studentId: string;
      classId: string;
      academicYear: string;
    }
  ) {
    const student = await prisma.student.findFirst({
      where: { id: data.studentId, organizationId },
    });
    if (!student) throw new AppError(404, 'Student not found');

    const cls = await prisma.class.findFirst({
      where: { id: data.classId, organizationId },
    });
    if (!cls) throw new AppError(404, 'Class not found');

    const existing = await prisma.enrollment.findFirst({
      where: {
        organizationId,
        studentId: data.studentId,
        academicYear: data.academicYear,
      },
    });
    if (existing) throw new AppError(409, 'Student already enrolled in this academic year');

    await prisma.enrollment.updateMany({
      where: { organizationId, studentId: data.studentId, isCurrent: true },
      data: { isCurrent: false },
    });

    return prisma.enrollment.create({
      data: {
        organizationId,
        studentId: data.studentId,
        classId: data.classId,
        academicYear: data.academicYear,
        isCurrent: true,
        recordedBy: userId,
      },
      include: { student: true, class: true },
    });
  }

  async promote(
    organizationId: string,
    userId: string,
    data: {
      enrollmentId: string;
      newClassId: string;
      newAcademicYear: string;
    }
  ) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { id: data.enrollmentId, organizationId },
    });
    if (!enrollment) throw new AppError(404, 'Enrollment not found');

    await prisma.enrollment.update({
      where: { id: data.enrollmentId },
      data: {
        status: EnrollmentStatus.PROMOTED,
        isCurrent: false,
        promotedToClassId: data.newClassId,
        promotedToYear: data.newAcademicYear,
      },
    });

    return prisma.enrollment.create({
      data: {
        organizationId,
        studentId: enrollment.studentId,
        classId: data.newClassId,
        academicYear: data.newAcademicYear,
        isCurrent: true,
        recordedBy: userId,
      },
      include: { student: true, class: true },
    });
  }

  async list(organizationId: string, query?: { classId?: string; academicYear?: string; isCurrent?: string }) {
    const where: any = { organizationId };
    if (query?.classId) where.classId = query.classId;
    if (query?.academicYear) where.academicYear = query.academicYear;
    if (query?.isCurrent !== undefined) where.isCurrent = query.isCurrent === 'true';

    return prisma.enrollment.findMany({
      where,
      include: { student: true, class: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listPromotions(
    organizationId: string,
    query?: { academicYear?: string; search?: string; classId?: string }
  ) {
    const where: any = {
      organizationId,
      status: EnrollmentStatus.PROMOTED,
    };
    if (query?.academicYear) where.academicYear = query.academicYear;
    if (query?.classId) where.classId = query.classId;

    const rows = await prisma.enrollment.findMany({
      where,
      include: {
        student: true,
        class: true,
        promotedToClass: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!query?.search?.trim()) return rows;

    const q = query.search.trim().toLowerCase();
    return rows.filter((row) => {
      const student = row.student;
      const name = `${student.firstName} ${student.lastName}`.toLowerCase();
      const code = (student.studentCode ?? student.studentUid ?? '').toLowerCase();
      const sdm = (student.sdmCode ?? '').toLowerCase();
      const fromClass = row.class?.name?.toLowerCase() ?? '';
      const fromStream = row.class?.stream?.toLowerCase() ?? '';
      const toClass = row.promotedToClass?.name?.toLowerCase() ?? '';
      const toStream = row.promotedToClass?.stream?.toLowerCase() ?? '';
      return (
        name.includes(q) ||
        code.includes(q) ||
        sdm.includes(q) ||
        fromClass.includes(q) ||
        fromStream.includes(q) ||
        `${fromClass} ${fromStream}`.includes(q) ||
        toClass.includes(q) ||
        toStream.includes(q) ||
        `${toClass} ${toStream}`.includes(q)
      );
    });
  }

  async getPromotion(organizationId: string, enrollmentId: string) {
    const row = await prisma.enrollment.findFirst({
      where: { id: enrollmentId, organizationId, status: EnrollmentStatus.PROMOTED },
      include: {
        student: { include: { enrollments: { include: { class: true }, orderBy: { createdAt: 'desc' } } } },
        class: true,
        promotedToClass: true,
      },
    });
    if (!row) throw new AppError(404, 'Promotion record not found');

    const newEnrollment = row.promotedToYear
      ? await prisma.enrollment.findFirst({
          where: {
            organizationId,
            studentId: row.studentId,
            academicYear: row.promotedToYear,
          },
          include: { class: true },
        })
      : null;

    return { promotion: row, newEnrollment };
  }

  async updatePromotionTarget(
    organizationId: string,
    enrollmentId: string,
    newClassId: string
  ) {
    const promotion = await prisma.enrollment.findFirst({
      where: { id: enrollmentId, organizationId, status: EnrollmentStatus.PROMOTED },
    });
    if (!promotion) throw new AppError(404, 'Promotion record not found');
    if (!promotion.promotedToYear) throw new AppError(400, 'Promotion has no target year');

    const targetClass = await prisma.class.findFirst({
      where: { id: newClassId, organizationId },
    });
    if (!targetClass) throw new AppError(404, 'Target class not found');

    const newEnrollment = await prisma.enrollment.findFirst({
      where: {
        organizationId,
        studentId: promotion.studentId,
        academicYear: promotion.promotedToYear,
      },
    });

    await prisma.$transaction([
      prisma.enrollment.update({
        where: { id: promotion.id },
        data: { promotedToClassId: newClassId },
      }),
      ...(newEnrollment
        ? [
            prisma.enrollment.update({
              where: { id: newEnrollment.id },
              data: { classId: newClassId },
            }),
          ]
        : []),
    ]);

    return this.getPromotion(organizationId, enrollmentId);
  }

  async revertPromotion(organizationId: string, enrollmentId: string) {
    const promotion = await prisma.enrollment.findFirst({
      where: { id: enrollmentId, organizationId, status: EnrollmentStatus.PROMOTED },
    });
    if (!promotion) throw new AppError(404, 'Promotion record not found');

    const newEnrollment = promotion.promotedToYear
      ? await prisma.enrollment.findFirst({
          where: {
            organizationId,
            studentId: promotion.studentId,
            academicYear: promotion.promotedToYear,
          },
        })
      : null;

    await prisma.$transaction(async (tx) => {
      if (newEnrollment) {
        await tx.enrollment.delete({ where: { id: newEnrollment.id } });
      }
      await tx.enrollment.updateMany({
        where: { organizationId, studentId: promotion.studentId, isCurrent: true },
        data: { isCurrent: false },
      });
      await tx.enrollment.update({
        where: { id: promotion.id },
        data: {
          status: EnrollmentStatus.ACTIVE,
          isCurrent: true,
          promotedToClassId: null,
          promotedToYear: null,
        },
      });
    });

    return { success: true };
  }
}

export const enrollmentService = new EnrollmentService();
