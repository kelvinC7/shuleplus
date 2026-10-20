import { AppError } from '../middleware/error.middleware';
import { resolveActiveStudent } from './parent-context.service';
import { academicModuleApi } from './academic-module-api';
import { feesApi } from './fees-api';
import type { StudentSelector } from '../utils/student-param';

export class ReportCardService {
  async listForParent(
    organizationId: string,
    parentId: string,
    requestedStudentId?: StudentSelector,
    query?: { academicYear?: string; term?: string }
  ) {
    const student = await resolveActiveStudent(organizationId, parentId, requestedStudentId);
    if (!academicModuleApi.enabled()) {
      return { student, items: [] as Array<Record<string, unknown>> };
    }

    const all = await academicModuleApi.listReportPublications(organizationId, {
      academicYear: query?.academicYear,
      term: query?.term,
      search: student.shuleCode,
    });

    const items = all.filter(
      (p) =>
        p.studentCode?.toLowerCase() === student.shuleCode.toLowerCase() ||
        p.studentId === student.id
    );

    const enriched = [];
    for (const pub of items) {
      let access = { published: true, allowed: true, message: null as string | null };
      try {
        access = await feesApi.getReportCardAccess(organizationId, {
          studentId: pub.studentId,
          studentCode: pub.studentCode ?? student.shuleCode,
          className: pub.className ?? undefined,
          academicYear: pub.academicYear,
          term: pub.term,
        });
      } catch {
        access = { published: true, allowed: true, message: null };
      }
      enriched.push({ ...pub, access });
    }

    return { student, items: enriched };
  }

  async getReport(
    organizationId: string,
    parentId: string,
    requestedStudentId: StudentSelector | undefined,
    query: { classId: string; academicYear: string; term: string }
  ) {
    const student = await resolveActiveStudent(organizationId, parentId, requestedStudentId);

    const access = await feesApi.getReportCardAccess(organizationId, {
      studentId: student.id,
      studentCode: student.shuleCode,
      academicYear: query.academicYear,
      term: query.term,
    });

    if (!access.published) {
      throw new AppError(404, access.message || 'Report card is not published yet.');
    }
    if (!access.allowed) {
      throw new AppError(
        403,
        access.message ||
          'Please pay remaining school fees to open the student report. Contact the school if you have a payment agreement.'
      );
    }

    if (!academicModuleApi.enabled()) {
      throw new AppError(503, 'Academic module is not available.');
    }

    return academicModuleApi.getParentReportCard(organizationId, {
      studentCode: student.shuleCode,
      studentId: student.id,
      classId: query.classId,
      academicYear: query.academicYear,
      term: query.term,
    });
  }
}

export const reportCardService = new ReportCardService();
