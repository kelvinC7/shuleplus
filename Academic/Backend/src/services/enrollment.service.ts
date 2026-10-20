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
}

export const enrollmentService = new EnrollmentService();
