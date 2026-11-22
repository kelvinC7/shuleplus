import { AppError } from '../middleware/error.middleware';
import { resolveActiveStudent, resolveParentContext } from './parent-context.service';
import { academicModuleApi } from './academic-module-api';
import { feesApi } from './fees-api';
import type { StudentSelector } from '../utils/student-param';
import { academicTermsEqual, academicYearsEqual, studentCodesMatch } from '../utils/academic-match';

type PublicationRow = {
  id: string;
  studentId: string;
  classId: string;
  className: string | null;
  studentName: string | null;
  studentCode: string | null;
  academicYear: string;
  term: string;
  publishedAt: string;
  reportKind?: string;
};

async function schoolOrg(
  jwtOrg: string,
  parentId: string,
  requested?: StudentSelector,
  student?: { organizationId: string }
) {
  const ctx = await resolveParentContext(jwtOrg, parentId, requested);
  return student?.organizationId?.trim() || ctx.organizationId;
}

function belongsToStudent(
  pub: PublicationRow,
  student: { id: string; shuleCode: string }
) {
  if (pub.studentId === student.id) return true;
  return (
    studentCodesMatch(pub.studentCode, student.shuleCode) ||
    studentCodesMatch(pub.studentCode, student.id)
  );
}

function matchesPeriod(
  pub: PublicationRow,
  query?: { academicYear?: string; term?: string }
) {
  if (query?.academicYear && !academicYearsEqual(pub.academicYear, query.academicYear)) return false;
  if (query?.term && !academicTermsEqual(pub.term, query.term)) return false;
  return true;
}

export class ReportCardService {
  private async fetchPublications(
    org: string,
    student: { id: string; shuleCode: string },
    query?: { academicYear?: string; term?: string }
  ) {
    const searches = [...new Set([student.shuleCode, student.id].map((c) => c?.trim()).filter(Boolean))];
    if (!searches.length) return [] as PublicationRow[];

    const attempts: Array<{ academicYear?: string; term?: string }> = [
      { academicYear: query?.academicYear, term: query?.term },
      { academicYear: query?.academicYear },
      {},
    ];

    const seen = new Set<string>();
    const merged: PublicationRow[] = [];

    for (const search of searches) {
      for (const filters of attempts) {
        try {
          const batch = await academicModuleApi.listReportPublications(org, {
            academicYear: filters.academicYear,
            term: filters.term,
            search,
          });
          for (const row of batch) {
            if (seen.has(row.id)) continue;
            if (!belongsToStudent(row, student)) continue;
            if (!matchesPeriod(row, query)) continue;
            seen.add(row.id);
            merged.push(row);
          }
        } catch {
          /* try broader fetch */
        }
      }
      if (merged.length) break;
    }

    return merged.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }

  async listForParent(
    organizationId: string,
    parentId: string,
    requestedStudentId?: StudentSelector,
    query?: { academicYear?: string; term?: string }
  ) {
    const student = await resolveActiveStudent(organizationId, parentId, requestedStudentId);
    const org = await schoolOrg(organizationId, parentId, requestedStudentId, student);

    if (!academicModuleApi.enabled()) {
      return { student, items: [] as Array<Record<string, unknown>> };
    }

    const items = await this.fetchPublications(org, student, query);

    const enriched = [];
    for (const pub of items) {
      let access: {
        published: boolean;
        allowed: boolean;
        message: string | null;
        balance?: number;
        paymentStatus?: string;
        hasActiveLoan?: boolean;
      } = {
        published: true,
        allowed: true,
        message: null,
      };
      try {
        const rcAccess = await feesApi.getReportCardAccess(org, {
          studentId: pub.studentId,
          studentCode: pub.studentCode ?? student.shuleCode,
          className: pub.className ?? undefined,
          academicYear: pub.academicYear,
          term: pub.term,
        });
        access = {
          // This row came from Academic publications, so treat it as published even if fees API is unsure.
          published: true,
          allowed: rcAccess.allowed !== false,
          message: rcAccess.message ?? null,
          balance: rcAccess.balance,
          paymentStatus: rcAccess.paymentStatus,
          hasActiveLoan: rcAccess.hasActiveLoan,
        };
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
    query: { classId: string; academicYear: string; term: string; reportKind?: 'standard' | 'midterm' | 'beginning' }
  ) {
    const student = await resolveActiveStudent(organizationId, parentId, requestedStudentId);
    const org = await schoolOrg(organizationId, parentId, requestedStudentId, student);

    let access: {
      published: boolean;
      allowed: boolean;
      message?: string | null;
    } = { published: true, allowed: true, message: null };

    try {
      access = await feesApi.getReportCardAccess(org, {
        studentCode: student.shuleCode,
        className: student.className ?? undefined,
        academicYear: query.academicYear,
        term: query.term,
      });
    } catch {
      access = { published: true, allowed: true, message: null };
    }

    if (!access.published && academicModuleApi.enabled()) {
      const pubs = await this.fetchPublications(org, student, {
        academicYear: query.academicYear,
        term: query.term,
      });
      const match = pubs.find(
        (p) =>
          p.classId === query.classId &&
          academicYearsEqual(p.academicYear, query.academicYear) &&
          academicTermsEqual(p.term, query.term)
      );
      if (match) {
        access = { ...access, published: true };
      }
    }

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

    const payload = await academicModuleApi.getParentReportCard(org, {
      studentCode: student.shuleCode,
      studentId: student.id,
      classId: query.classId,
      academicYear: query.academicYear,
      term: query.term,
      reportKind: query.reportKind,
    });
    return payload;
  }
}

export const reportCardService = new ReportCardService();
