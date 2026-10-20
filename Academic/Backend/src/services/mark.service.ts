import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class MarkService {
  async getStudentsForEntry(organizationId: string, classId: string, academicYear: string) {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        organizationId,
        classId,
        academicYear,
        isCurrent: true,
        status: 'ACTIVE',
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, studentUid: true },
        },
      },
      orderBy: { student: { firstName: 'asc' } },
    });
    return enrollments.map(e => e.student);
  }

  async getMarksForEntry(organizationId: string, examId: string, classId: string, subjectId: string) {
    return prisma.markEntry.findMany({
      where: {
        organizationId,
        examId,
        classId,
        subjectId,
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, studentUid: true },
        },
      },
    });
  }

  async bulkSave(organizationId: string, data: {
    examId: string;
    classId: string;
    subjectId: string;
    marks: { studentId: string; score: number; remarks?: string }[];
  }) {
    const exam = await prisma.exam.findFirst({ where: { id: data.examId, organizationId } });
    if (!exam) throw new AppError(404, 'Exam not found');

    const subject = await prisma.subject.findFirst({ where: { id: data.subjectId, organizationId } });
    if (!subject) throw new AppError(404, 'Subject not found');

    const classRecord = await prisma.class.findFirst({ where: { id: data.classId, organizationId } });
    if (!classRecord) throw new AppError(404, 'Class not found');

    const results = await Promise.all(
      data.marks.map(async (mark) => {
        if (mark.score < 0) throw new AppError(400, `Score cannot be negative for student ${mark.studentId}`);

        return prisma.markEntry.upsert({
          where: {
            examId_studentId_subjectId: {
              examId: data.examId,
              studentId: mark.studentId,
              subjectId: data.subjectId,
            },
          },
          update: {
            score: mark.score,
            remarks: mark.remarks ?? null,
            classId: data.classId,
          },
          create: {
            organizationId,
            examId: data.examId,
            studentId: mark.studentId,
            subjectId: data.subjectId,
            classId: data.classId,
            score: mark.score,
            remarks: mark.remarks ?? null,
          },
        });
      })
    );

    return { saved: results.length, marks: results };
  }

  async listByExamAndClass(organizationId: string, examId: string, classId: string) {
    return prisma.markEntry.findMany({
      where: { organizationId, examId, classId },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, studentUid: true },
        },
        subject: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: [{ subject: { name: 'asc' } }, { student: { firstName: 'asc' } }],
    });
  }

  async delete(organizationId: string, id: string) {
    const existing = await prisma.markEntry.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Mark entry not found');
    await prisma.markEntry.delete({ where: { id } });
    return { message: 'Mark entry deleted' };
  }

  async deleteByEntry(organizationId: string, examId: string, classId: string, subjectId: string) {
    const result = await prisma.markEntry.deleteMany({
      where: { organizationId, examId, classId, subjectId },
    });
    return { deleted: result.count };
  }
}

export const markService = new MarkService();
