import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { ensureAcademicStudent } from './sm-resolve.service';
import { parentMisAcademicClient } from '../clients/parent-mis.client';
import { assertOwnRecord, mergeOwnData } from '../middleware/academic-scope';

const LOCKED_ASSESSMENT_STATUSES = new Set(['SUBMITTED', 'REVIEWED', 'APPROVED', 'LOCKED']);

export class AssessmentMarkService {
  private async notifyAssessmentMarksSaved(
    organizationId: string,
    assessmentId: string,
    marks: Array<{ studentId: string; score?: number | null }>
  ) {
    try {
      if (!parentMisAcademicClient.isEnabled() || !marks.length) return;
      const assessment = await prisma.assessment.findFirst({
        where: { id: assessmentId, organizationId },
        include: {
          subject: { select: { name: true } },
          class: { select: { name: true, stream: true } },
          component: { select: { name: true } },
        },
      });
      const students = await prisma.student.findMany({
        where: { organizationId, id: { in: marks.map((m) => m.studentId) } },
        select: { id: true, firstName: true, lastName: true, studentUid: true, studentCode: true },
      });
      const byId = new Map(students.map((s) => [s.id, s]));
      const subjectName = assessment?.subject?.name || 'Assessment';
      const classLabel = [assessment?.class?.name, (assessment?.class as any)?.stream].filter(Boolean).join(' ');
      const componentName = (assessment as any)?.component?.name || assessment?.title || 'Assessment';
      await parentMisAcademicClient.notifyMany(
        marks.map((m) => {
          const s = byId.get(m.studentId);
          const studentName = s ? `${s.firstName || ''} ${s.lastName || ''}`.trim() : 'Student';
          const studentCode = s?.studentUid || s?.studentCode || s?.id || m.studentId;
          const scoreText = m.score == null ? 'updated' : `recorded (${m.score})`;
          return {
            organizationId,
            studentId: s?.id || m.studentId,
            studentCode,
            studentName,
            title: `${subjectName} assessment marks ${m.score == null ? 'updated' : 'recorded'}`,
            body: `${studentName}'s ${subjectName} (${componentName}) mark has been ${scoreText}${classLabel ? ` in ${classLabel}` : ''}.`,
            eventType: 'ASSESSMENT_MARK_RECORDED',
            priority: 'NORMAL' as const,
            link: '/academics',
            metadata: {
              module: 'academic',
              action: 'assessment_mark_saved',
              assessmentId,
              assessmentTitle: assessment?.title || null,
              subjectName,
              className: classLabel || null,
              score: m.score ?? null,
            },
          };
        })
      );
    } catch (err) {
      console.warn('[Academic] Failed to notify parents for assessment marks:', err);
    }
  }
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
      where: mergeOwnData({ id: assessmentId, organizationId }),
    });
    if (!assessment) throw new AppError(404, 'Assessment not found');
    assertOwnRecord(assessment.createdBy, 'assessment');
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

    // Announce parents for every student whose assessment marks were saved/updated
    void this.notifyAssessmentMarksSaved(
      organizationId,
      assessmentId,
      resolved.map((r) => ({ studentId: r.studentId, score: r.score ?? null }))
    );

    return { message: `${results.length} marks saved`, count: results.length };
  }

  async getMarks(assessmentId: string, organizationId: string) {
    const assessment = await prisma.assessment.findFirst({
      where: mergeOwnData({ id: assessmentId, organizationId }),
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
      where: mergeOwnData({ id: assessmentId, organizationId }),
    });
    if (!assessment) throw new AppError(404, 'Assessment not found');
    assertOwnRecord(assessment.createdBy, 'assessment');
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

    const assessment = await prisma.assessment.findFirst({
      where: { id: request.assessmentId, organizationId },
      select: { id: true, maxMark: true },
    });
    if (!assessment) throw new AppError(404, 'The assessment for this request no longer exists');

    const reviewedAt = new Date();

    // Keep the review decision and the applied mark atomic. The mark row may not
    // exist (e.g. correction requested for a student whose mark was never
    // saved), so upsert instead of update to avoid a P2025 → HTTP 500.
    return prisma.$transaction(async (tx) => {
      const updated = await tx.markCorrectionRequest.update({
        where: { id: requestId },
        data: {
          status: data.approved ? 'APPROVED' : 'REJECTED',
          reviewedBy: data.reviewedBy ?? null,
          reviewedAt,
          reviewNotes: data.reviewNotes ?? null,
        },
      });

      if (data.approved) {
        await tx.assessmentMark.upsert({
          where: {
            assessmentId_studentId: {
              assessmentId: request.assessmentId,
              studentId: request.studentId,
            },
          },
          update: {
            score: request.requestedScore,
            maxMark: assessment.maxMark,
            lastModifiedBy: data.reviewedBy ?? null,
            lastModifiedAt: reviewedAt,
          },
          create: {
            organizationId,
            assessmentId: request.assessmentId,
            studentId: request.studentId,
            score: request.requestedScore,
            maxMark: assessment.maxMark,
            markStatus: 'PRESENT',
            enteredBy: data.reviewedBy ?? null,
            enteredAt: reviewedAt,
            lastModifiedBy: data.reviewedBy ?? null,
            lastModifiedAt: reviewedAt,
          },
        });
      }

      return updated;
    });
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
