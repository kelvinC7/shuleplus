import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { ensureAcademicStudent } from './sm-resolve.service';

const LOCKED_ASSESSMENT_STATUSES = new Set(['SUBMITTED', 'REVIEWED', 'APPROVED', 'LOCKED']);

export class AssessmentMarkService {
  async enterMarks(assessmentId: string, organizationId: string, data: {
    marks: Array<{
      studentId: string;
      studentCode?: string;
      fullName?: string;
      score?: number;
      markStatus?: string;
      remarks?: string;
      competencies?: any;
    }>;
    enteredBy?: string;
  }) {
    const assessment = await prisma.assessment.findFirst({
      where: { id: assessmentId, organizationId },
    });
    if (!assessment) throw new AppError(404, 'Assessment not found');
    if (LOCKED_ASSESSMENT_STATUSES.has(assessment.status)) {
      throw new AppError(
        400,
        'This assessment is published. Request an edit from Academic administrators.'
      );
    }

    const maxMark = Number(assessment.maxMark);

    for (const entry of data.marks) {
      const markStatus = entry.markStatus || 'PRESENT';
      if (markStatus === 'PRESENT' && entry.score != null) {
        if (entry.score < 0) {
          throw new AppError(400, `Score cannot be negative for student ${entry.studentId}`);
        }
        if (entry.score > maxMark) {
          throw new AppError(400, `Score ${entry.score} exceeds maximum mark of ${maxMark}`);
        }
      }
    }

    const resolved = [];
    for (const entry of data.marks) {
      const student = await ensureAcademicStudent(organizationId, {
        studentId: entry.studentId,
        studentCode: entry.studentCode,
        fullName: entry.fullName,
      });
      resolved.push({ ...entry, studentId: student.id });
    }

    const results = await prisma.$transaction(
      resolved.map((entry) =>
        prisma.assessmentMark.upsert({
          where: {
            assessmentId_studentId: {
              assessmentId,
              studentId: entry.studentId,
            },
          },
          update: {
            score: entry.score != null ? entry.score : null,
            maxMark,
            markStatus: (entry.markStatus as any) || 'PRESENT',
            remarks: entry.remarks ?? null,
            competencies: entry.competencies ?? null,
            lastModifiedBy: data.enteredBy ?? null,
            lastModifiedAt: new Date(),
          },
          create: {
            organizationId,
            assessmentId,
            studentId: entry.studentId,
            score: entry.score != null ? entry.score : null,
            maxMark,
            markStatus: (entry.markStatus as any) || 'PRESENT',
            remarks: entry.remarks ?? null,
            competencies: entry.competencies ?? null,
            enteredBy: data.enteredBy ?? null,
            enteredAt: new Date(),
          },
        })
      )
    );

    return { message: `${results.length} marks saved`, count: results.length };
  }

  async getMarks(assessmentId: string, organizationId: string) {
    const assessment = await prisma.assessment.findFirst({
      where: { id: assessmentId, organizationId },
      include: {
        subject: true,
        class: true,
        component: true,
        marks: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, studentUid: true } },
          },
          orderBy: { student: { lastName: 'asc' } },
        },
      },
    });
    if (!assessment) throw new AppError(404, 'Assessment not found');
    return assessment;
  }

  async requestCorrection(assessmentId: string, organizationId: string, data: {
    studentId: string;
    currentScore: number;
    requestedScore: number;
    reason: string;
    requestedBy?: string;
  }) {
    const assessment = await prisma.assessment.findFirst({
      where: { id: assessmentId, organizationId },
    });
    if (!assessment) throw new AppError(404, 'Assessment not found');
    if (assessment.status === 'DRAFT' || assessment.status === 'OPEN' || assessment.status === 'MARK_ENTRY') {
      throw new AppError(400, 'You can edit marks directly while the assessment is still a draft.');
    }

    const student = await ensureAcademicStudent(organizationId, { studentId: data.studentId });

    const pending = await prisma.markCorrectionRequest.findFirst({
      where: {
        organizationId,
        assessmentId,
        studentId: student.id,
        status: 'PENDING',
      },
    });
    if (pending) {
      throw new AppError(409, 'A pending edit request already exists for this student.');
    }

    return prisma.markCorrectionRequest.create({
      data: {
        organizationId,
        assessmentId,
        studentId: student.id,
        currentScore: data.currentScore,
        requestedScore: data.requestedScore,
        reason: data.reason,
        requestedBy: data.requestedBy ?? null,
        status: 'PENDING',
      },
    });
  }

  async reviewCorrection(requestId: string, organizationId: string, data: {
    approved: boolean;
    reviewNotes?: string;
    reviewedBy?: string;
  }) {
    const request = await prisma.markCorrectionRequest.findFirst({
      where: { id: requestId, organizationId },
    });
    if (!request) throw new AppError(404, 'Correction request not found');
    if (request.status !== 'PENDING') {
      throw new AppError(400, 'This request has already been reviewed');
    }

    const updated = await prisma.markCorrectionRequest.update({
      where: { id: requestId },
      data: {
        status: data.approved ? 'APPROVED' : 'REJECTED',
        reviewedBy: data.reviewedBy ?? null,
        reviewedAt: new Date(),
        reviewNotes: data.reviewNotes ?? null,
      },
    });

    if (data.approved) {
      await prisma.assessmentMark.update({
        where: { assessmentId_studentId: { assessmentId: request.assessmentId, studentId: request.studentId } },
        data: {
          score: request.requestedScore,
          lastModifiedBy: data.reviewedBy ?? null,
          lastModifiedAt: new Date(),
        },
      });
    }

    return updated;
  }

  async listCorrections(organizationId: string, status?: string) {
    const where: any = { organizationId };
    if (status && status !== 'all') where.status = status.toUpperCase();

    return prisma.markCorrectionRequest.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true, studentUid: true } },
        assessment: {
          include: {
            subject: true,
            class: true,
            component: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** @deprecated use listCorrections */
  async getPendingCorrections(organizationId: string) {
    return this.listCorrections(organizationId, 'PENDING');
  }
}

export const assessmentMarkService = new AssessmentMarkService();
