import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { parentMisAcademicClient } from '../clients/parent-mis.client';

export class MarkService {
  private async notifyMarksSaved(
    organizationId: string,
    savedMarks: Array<{ id: string; studentId: string; score: number; remarks?: string | null }>,
    meta: { examId: string; subjectId: string; classId: string }
  ) {
    try {
      if (!parentMisAcademicClient.isEnabled() || !savedMarks.length) return;
      const [exam, subject, classRecord, students] = await Promise.all([
        prisma.exam.findFirst({ where: { id: meta.examId, organizationId }, select: { id: true, name: true, term: true } }),
        prisma.subject.findFirst({ where: { id: meta.subjectId, organizationId }, select: { id: true, name: true, code: true } }),
        prisma.class.findFirst({ where: { id: meta.classId, organizationId }, select: { id: true, name: true, stream: true } }),
        prisma.student.findMany({
          where: { organizationId, id: { in: savedMarks.map((m) => m.studentId) } },
          select: { id: true, firstName: true, lastName: true, studentUid: true, studentCode: true },
        }),
      ]);
      const studentById = new Map(students.map((s) => [s.id, s]));
      const examName = exam?.name || 'Exam';
      const subjectName = subject?.name || 'Subject';
      const classLabel = [classRecord?.name, classRecord?.stream].filter(Boolean).join(' ');
      await parentMisAcademicClient.notifyMany(
        savedMarks.map((m) => {
          const s = studentById.get(m.studentId);
          const studentName = s ? `${s.firstName || ''} ${s.lastName || ''}`.trim() : 'Student';
          const studentCode = s?.studentUid || s?.studentCode || s?.id || m.studentId;
          return {
            organizationId,
            studentId: s?.id || m.studentId,
            studentCode,
            studentName,
            title: `New marks recorded: ${subjectName}`,
            body: `${studentName}'s ${subjectName} mark (${m.score}) has been recorded for ${examName}${classLabel ? ` in ${classLabel}` : ''}.`,
            eventType: 'MARK_RECORDED',
            priority: 'NORMAL' as const,
            link: '/academics',
            metadata: {
              module: 'academic',
              action: 'mark_saved',
              examId: meta.examId,
              examName,
              subjectId: meta.subjectId,
              subjectName,
              classId: meta.classId,
              className: classLabel || null,
              score: m.score,
            },
          };
        })
      );
    } catch (err) {
      console.warn('[Academic] Failed to notify parents for saved marks:', err);
    }
  }
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

    // Announce parents for every student whose marks were saved/updated
    void this.notifyMarksSaved(organizationId, results as any, {
      examId: data.examId,
      subjectId: data.subjectId,
      classId: data.classId,
    });

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
