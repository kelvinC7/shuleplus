import { BillStatus, ExamDecision, FeeStructureStatus, LoanStatus, Prisma } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { fetchAcademicReportPublications } from '../clients/academic-module.client';
import { EXCEPTION_REASONS, examinationEligibilityService } from './examination-eligibility.service';
import {
  getOrCreateReportCardAccessPolicy,
  listReportCardAccessOverrides,
  updateReportCardAccessPolicy,
  upsertReportCardAccessOverride,
} from './report-card-access.store';

function num(v: Prisma.Decimal | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : Number(v);
}

function actorName(actor?: { email?: string; sub?: string }) {
  return actor?.email || actor?.sub || 'School administrator';
}

function financialRowFromPreview(
  studentId: string,
  previewStudents: Array<{
    studentId: string;
    totalFees: number;
    paidAmount: number;
    balance: number;
    paymentStatus?: string;
    financialStatus: string;
    decision: ExamDecision;
    allowed: boolean;
    exceptionReason?: string | null;
    exceptionNote?: string | null;
  }>
) {
  return previewStudents.find((s) => s.studentId === studentId) ?? null;
}

export const reportCardAccessService = {
  reasons() {
    return EXCEPTION_REASONS;
  },

  async getPolicy(organizationId: string) {
    return getOrCreateReportCardAccessPolicy(organizationId);
  },

  async updatePolicy(
    organizationId: string,
    body: { requireFeesClearance?: boolean; blockWhenLoanActive?: boolean }
  ) {
    return updateReportCardAccessPolicy(organizationId, body);
  },

  async preview(
    organizationId: string,
    query: { academicYear?: string; term?: string; className?: string; search?: string; accessFilter?: string }
  ) {
    const academicYear = query.academicYear?.trim();
    const term = query.term?.trim();
    const className = query.className?.trim();
    if (!academicYear || !term) throw new AppError(400, 'Select academic year and term');

    const pol = await getOrCreateReportCardAccessPolicy(organizationId);
    const publications = await fetchAcademicReportPublications(organizationId, {
      academicYear,
      term,
      className,
      search: query.search,
    });

    let feePreview: Awaited<ReturnType<typeof examinationEligibilityService.preview>> | null = null;
    if (className) {
      try {
        feePreview = await examinationEligibilityService.preview(organizationId, {
          academicYear,
          term,
          className,
          examName: 'Report Card Access',
          search: query.search,
        });
      } catch {
        feePreview = null;
      }
    }

    const overrides = await listReportCardAccessOverrides(organizationId, academicYear, term);
    const overrideByStudent = new Map(overrides.map((o) => [o.studentId, o]));

    const pubByStudent = new Map(publications.map((p) => [p.studentId, p]));

    const studentIds = new Set<string>([
      ...publications.map((p) => p.studentId),
      ...(feePreview?.students.map((s) => s.studentId) ?? []),
    ]);

    const rows = [...studentIds].map((studentId) => {
      const pub = pubByStudent.get(studentId);
      const fee = feePreview ? financialRowFromPreview(studentId, feePreview.students) : null;
      const override = overrideByStudent.get(studentId);
      const balance = fee?.balance ?? 0;
      const paid = fee?.paymentStatus === 'PAID';
      const hasLoan =
        pol.blockWhenLoanActive &&
        false; // filled below per student if needed

      return {
        studentId,
        studentCode: pub?.studentCode ?? (fee as { studentCode?: string } | null)?.studentCode ?? '',
        studentName: pub?.studentName ?? (fee as { studentName?: string } | null)?.studentName ?? '',
        className: pub?.className ?? className ?? '',
        academicPublished: Boolean(pub),
        publishedAt: pub?.publishedAt ?? null,
        paymentStatus: fee?.paymentStatus ?? (balance <= 0 ? 'PAID' : 'UNKNOWN'),
        balance,
        paidAmount: fee?.paidAmount ?? 0,
        totalFees: fee?.totalFees ?? 0,
        hasActiveLoan: hasLoan,
        overrideDecision: override?.decision ?? null,
        exceptionReason: override?.exceptionReason ?? fee?.exceptionReason ?? null,
        exceptionNote: override?.exceptionNote ?? fee?.exceptionNote ?? null,
        allowed: false as boolean,
        blockReason: null as string | null,
      };
    });

    const loanRows = await prisma.loanApplication.findMany({
      where: {
        organizationId,
        academicYear: { contains: academicYear, mode: 'insensitive' },
        term: { contains: term, mode: 'insensitive' },
        status: { in: [LoanStatus.UNDER_REVIEW, LoanStatus.APPROVED, LoanStatus.DISBURSED] },
      },
      select: { studentId: true, studentCode: true, status: true },
    });
    const loanSet = new Set(loanRows.map((l) => l.studentId));
    const loanCodeSet = new Set(loanRows.map((l) => l.studentCode.toLowerCase()));

    for (const row of rows) {
      row.hasActiveLoan = loanSet.has(row.studentId) || loanCodeSet.has((row.studentCode || '').toLowerCase());

      if (!row.academicPublished) {
        row.allowed = false;
        row.blockReason = 'Report not published by Academic';
        continue;
      }

      const manual = overrideByStudent.get(row.studentId);
      if (manual?.decision === ExamDecision.MANUALLY_ALLOWED) {
        row.allowed = true;
        row.blockReason = null;
        continue;
      }
      if (manual?.decision === ExamDecision.MANUALLY_BLOCKED) {
        row.allowed = false;
        row.blockReason = manual.exceptionNote || 'Manually blocked';
        continue;
      }

      if (row.hasActiveLoan && pol.blockWhenLoanActive) {
        row.allowed = false;
        row.blockReason = 'Active school fees loan — complete payments to view report';
        continue;
      }

      if (pol.requireFeesClearance && row.balance > 0 && row.paymentStatus !== 'PAID') {
        row.allowed = false;
        row.blockReason = 'Pay remaining school fees to open student report';
        continue;
      }

      row.allowed = true;
      row.blockReason = null;
    }

    let filtered = rows;
    const af = query.accessFilter?.trim();
    if (af === 'allowed') filtered = rows.filter((r) => r.allowed);
    if (af === 'blocked') filtered = rows.filter((r) => !r.allowed);
    if (af === 'published') filtered = rows.filter((r) => r.academicPublished);
    if (af === 'unpublished') filtered = rows.filter((r) => !r.academicPublished);
    if (af === 'paid') filtered = rows.filter((r) => r.paymentStatus === 'PAID');
    if (af === 'unpaid') filtered = rows.filter((r) => r.paymentStatus !== 'PAID' && r.balance > 0);

    const totals = {
      total: rows.length,
      published: rows.filter((r) => r.academicPublished).length,
      allowed: rows.filter((r) => r.allowed).length,
      blocked: rows.filter((r) => !r.allowed).length,
      unpaid: rows.filter((r) => r.balance > 0).length,
    };

    return { academicYear, term, className: className ?? null, policy: pol, totals, students: filtered };
  },

  async setException(
    organizationId: string,
    actor: { sub?: string; email?: string },
    body: {
      studentId: string;
      studentCode?: string;
      academicYear: string;
      term: string;
      decision: 'MANUALLY_ALLOWED' | 'MANUALLY_BLOCKED';
      exceptionReason?: string;
      exceptionNote?: string;
    }
  ) {
    return upsertReportCardAccessOverride({
      organizationId,
      studentId: body.studentId,
      studentCode: body.studentCode ?? null,
      academicYear: body.academicYear,
      term: body.term,
      decision: body.decision,
      exceptionReason: body.exceptionReason ?? null,
      exceptionNote: body.exceptionNote ?? null,
      exceptionById: actor.sub ?? null,
      exceptionByName: actorName(actor),
    });
  },

  async lookup(
    organizationId: string,
    query: {
      studentId?: string;
      studentCode?: string;
      className?: string;
      academicYear?: string;
      term?: string;
    }
  ) {
    const academicYear = query.academicYear?.trim();
    const term = query.term?.trim();
    const studentId = query.studentId?.trim();
    const studentCode = query.studentCode?.trim();
    if (!academicYear || !term || (!studentId && !studentCode)) {
      throw new AppError(400, 'academicYear, term, and student required');
    }

    const publications = await fetchAcademicReportPublications(organizationId, { academicYear, term });
    const pub = publications.find(
      (p) =>
        (studentId && p.studentId === studentId) ||
        (studentCode && p.studentCode?.toLowerCase() === studentCode.toLowerCase())
    );
    if (!pub) {
      return {
        published: false,
        allowed: false,
        message: 'Report card is not published yet.',
      };
    }

    const className = query.className?.trim() || pub.className || '';
    const preview =
      className || pub.className
        ? await this.preview(organizationId, {
            academicYear,
            term,
            className: className || pub.className || undefined,
            search: pub.studentCode ?? undefined,
          })
        : null;
    const row = preview?.students.find((s) => s.studentId === pub.studentId);
    if (!row) {
      return {
        published: true,
        allowed: true,
        message: 'Published; fees clearance not evaluated for this class.',
        publication: pub,
      };
    }

    return {
      published: true,
      allowed: row.allowed,
      message: row.allowed ? null : row.blockReason,
      publication: pub,
      balance: row.balance,
      paymentStatus: row.paymentStatus,
      hasActiveLoan: row.hasActiveLoan,
    };
  },
};
