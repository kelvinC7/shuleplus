import { BillStatus, ExamDecision, ExamFinancialStatus, ExamListStatus, FeeStructureStatus, Prisma } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { studentManagementClient } from '../clients/student-management.client';

export const EXCEPTION_REASONS = [
  'Parent payment agreement',
  'Payment pending verification',
  'Scholarship / sponsorship',
  'Financial assistance approved',
  'Special school authorization',
  'Administrative error',
  'Other',
] as const;

function num(v: Prisma.Decimal | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : Number(v);
}

function slugPart(value: string) {
  return value.replace(/[^A-Za-z0-9]+/g, '').toUpperCase().slice(0, 8) || 'EXAM';
}

function actorName(actor?: { email?: string; sub?: string; roles?: string[] }) {
  return actor?.email || actor?.sub || 'School administrator';
}

function canOverride(roles: string[] | undefined) {
  const set = new Set((roles ?? []).map((r) => r.toLowerCase()));
  return (
    set.has('organization_admin')
    || set.has('root_admin')
    || set.has('super_admin')
    || set.has('head_teacher')
    || set.has('school_administrator')
    || set.has('finance_officer')
    || set.has('fees_officer')
    || set.has('organization_member')
  );
}

function normalizeYear(value: string) {
  return value.replace(/\//g, '-').replace(/\s+/g, '').toLowerCase();
}

function normalizeTerm(value: string) {
  const raw = value.toLowerCase().replace(/\s+/g, '');
  if (raw.includes('3') || raw.includes('iii')) return 'term3';
  if (raw.includes('2') || raw.includes('ii')) return 'term2';
  return 'term1';
}

function classFamily(name: string) {
  return name.trim().toLowerCase().replace(/\s+[a-z0-9]$/i, '').trim();
}

function classMatches(structureClass: string | null | undefined, selected: string) {
  const a = (structureClass ?? '').trim().toLowerCase();
  const b = selected.trim().toLowerCase();
  if (!a) return true;
  if (a === b) return true;
  if (classFamily(a) === classFamily(b)) return true;
  if (b.startsWith(`${a} `) || a.startsWith(`${b} `)) return true;
  return a.includes(b) || b.includes(a);
}

function decisionFrom(financial: ExamFinancialStatus, stored?: { decision: ExamDecision } | null): ExamDecision {
  if (stored?.decision === ExamDecision.MANUALLY_ALLOWED || stored?.decision === ExamDecision.MANUALLY_BLOCKED) {
    return stored.decision;
  }
  return financial === ExamFinancialStatus.CLEARED ? ExamDecision.AUTO_ALLOWED : ExamDecision.NOT_ALLOWED;
}

export const examinationEligibilityService = {
  reasons() {
    return EXCEPTION_REASONS;
  },

  async classStatuses(
    organizationId: string,
    query: { academicYear?: string; term?: string; examName?: string },
  ) {
    const academicYear = query.academicYear?.trim() || '';
    const term = query.term?.trim() || '';
    const examName = query.examName?.trim() || 'End of Term Examination';
    const lists = await prisma.examEligibilityList.findMany({
      where: {
        organizationId,
        ...(academicYear ? { academicYear } : {}),
        ...(term ? { term } : {}),
        examName,
      },
      include: { _count: { select: { students: true } } },
      orderBy: [{ className: 'asc' }, { version: 'desc' }],
    });
    const latest = new Map<string, (typeof lists)[number]>();
    for (const list of lists) {
      if (!latest.has(list.className)) latest.set(list.className, list);
    }
    return [...latest.values()].map((list) => ({
      className: list.className,
      status: list.status,
      version: list.version,
      versionLabel: list.versionLabel,
      publishedAt: list.publishedAt,
      publishedByName: list.publishedByName,
      studentCount: list._count.students,
    }));
  },

  async preview(
    organizationId: string,
    query: { academicYear?: string; term?: string; className?: string; examName?: string; search?: string },
  ) {
    const academicYear = query.academicYear?.trim();
    const term = query.term?.trim();
    const className = query.className?.trim();
    const examName = query.examName?.trim() || 'End of Term Examination';
    if (!academicYear || !term || !className) {
      throw new AppError(400, 'Select academic year, term and class');
    }

    const students = await studentManagementClient.searchStudents(organizationId, {
      status: 'ACTIVE',
      className,
      search: query.search?.trim() || undefined,
    });

    const yearKey = normalizeYear(academicYear);
    const termKey = normalizeTerm(term);
    const structures = await prisma.feeStructure.findMany({
      where: { organizationId, status: { in: [FeeStructureStatus.ACTIVE, FeeStructureStatus.DRAFT] } },
      include: { items: true },
      orderBy: [{ version: 'desc' }],
    });
    const structure = structures
      .filter((s) => normalizeYear(s.academicYear) === yearKey && normalizeTerm(s.term) === termKey && classMatches(s.className, className))
      .sort((a, b) => {
        const aExact = (a.className ?? '').trim().toLowerCase() === className.toLowerCase() ? 1 : 0;
        const bExact = (b.className ?? '').trim().toLowerCase() === className.toLowerCase() ? 1 : 0;
        if (bExact !== aExact) return bExact - aExact;
        if (a.status !== b.status) return a.status === FeeStructureStatus.ACTIVE ? -1 : 1;
        return b.version - a.version;
      })[0] ?? null;
    const structureTotal = structure
      ? (num(structure.totalAmount) || structure.items.reduce((sum, item) => sum + num(item.amount), 0))
      : 0;

    const bills = await prisma.studentBill.findMany({
      where: {
        organizationId,
        status: { not: BillStatus.CANCELLED },
        academicYear: { contains: academicYear, mode: 'insensitive' },
        term: { contains: term, mode: 'insensitive' },
      },
    });
    const billById = new Map(bills.map((b) => [b.studentId, b]));
    const billByCode = new Map(bills.map((b) => [b.studentCode.toLowerCase(), b]));

    const working = await this.ensureDraft(organizationId, { academicYear, term, className, examName });
    const stored = new Map(working.students.map((s) => [s.studentId, s]));
    const storedByCode = new Map(working.students.map((s) => [s.studentCode.toLowerCase(), s]));

    const rows = students.map((s) => {
      const bill = billById.get(s.id) || billByCode.get((s.studentCode || '').toLowerCase());
      const paidAmount = bill ? num(bill.paidAmount) : 0;
      const waived = bill ? num(bill.discountAmount) + num(bill.scholarshipAmount) : 0;
      const totalFees = structureTotal || (bill ? num(bill.netAmount) : 0);
      const balance = Math.max(0, totalFees - waived - paidAmount);
      const paymentStatus = totalFees > 0 && balance <= 0
        ? 'PAID'
        : paidAmount > 0 && balance > 0
          ? 'PARTIAL'
          : 'UNPAID';
      const auto = paymentStatus === 'PAID' ? ExamFinancialStatus.CLEARED : ExamFinancialStatus.NOT_CLEARED;
      const exception = stored.get(s.id) || storedByCode.get((s.studentCode || '').toLowerCase());
      const decision = decisionFrom(auto, exception);
      return {
        studentId: s.id,
        studentCode: s.studentCode,
        studentName: s.fullName,
        className: s.className || className,
        totalFees,
        paidAmount,
        balance,
        paymentStatus,
        financialStatus: auto,
        decision,
        exceptionReason: exception?.exceptionReason ?? null,
        exceptionNote: exception?.exceptionNote ?? null,
        exceptionReference: exception?.exceptionReference ?? null,
        exceptionByName: exception?.exceptionByName ?? null,
        exceptionAt: exception?.exceptionAt ?? null,
        allowed: decision === ExamDecision.AUTO_ALLOWED || decision === ExamDecision.MANUALLY_ALLOWED,
      };
    });

    const published = await prisma.examEligibilityList.findFirst({
      where: { organizationId, academicYear, term, className, examName, status: ExamListStatus.PUBLISHED },
      orderBy: { version: 'desc' },
    });

    const totals = {
      total: rows.length,
      autoCleared: rows.filter((r) => r.financialStatus === ExamFinancialStatus.CLEARED).length,
      notCleared: rows.filter((r) => r.financialStatus === ExamFinancialStatus.NOT_CLEARED).length,
      manualAllowed: rows.filter((r) => r.decision === ExamDecision.MANUALLY_ALLOWED).length,
      manualBlocked: rows.filter((r) => r.decision === ExamDecision.MANUALLY_BLOCKED).length,
      allowed: rows.filter((r) => r.allowed).length,
      blocked: rows.filter((r) => !r.allowed).length,
    };

    return {
      academicYear,
      term,
      className,
      examName,
      draftId: working.id,
      published: published
        ? {
            id: published.id,
            version: published.version,
            versionLabel: published.versionLabel,
            publishedAt: published.publishedAt,
            publishedByName: published.publishedByName,
          }
        : null,
      reasons: EXCEPTION_REASONS,
      structure: structure
        ? { id: structure.id, name: structure.name, className: structure.className, totalAmount: structureTotal }
        : null,
      totals,
      students: rows,
    };
  },

  async ensureDraft(
    organizationId: string,
    input: { academicYear: string; term: string; className: string; examName: string },
  ) {
    const existing = await prisma.examEligibilityList.findFirst({
      where: { organizationId, ...input, status: ExamListStatus.DRAFT },
      include: { students: true },
      orderBy: { version: 'desc' },
    });
    if (existing) return existing;
    const latest = await prisma.examEligibilityList.findFirst({
      where: { organizationId, ...input },
      include: { students: true },
      orderBy: { version: 'desc' },
    });
    return prisma.examEligibilityList.create({
      data: {
        organizationId,
        ...input,
        status: ExamListStatus.DRAFT,
        version: (latest?.version ?? 0) + 1,
      },
      include: { students: true },
    });
  },

  async setException(
    organizationId: string,
    actor: { sub?: string; email?: string; roles?: string[] },
    body: {
      academicYear: string;
      term: string;
      className: string;
      examName?: string;
      studentId: string;
      studentCode?: string;
      studentName?: string;
      allow: boolean;
      reason: string;
      note?: string;
      reference?: string;
    },
  ) {
    if (!canOverride(actor.roles)) {
      throw new AppError(403, 'Only an authorized school administrator can record an examination exception.');
    }
    const reason = body.reason?.trim();
    if (!reason || !EXCEPTION_REASONS.includes(reason as (typeof EXCEPTION_REASONS)[number])) {
      throw new AppError(400, 'Select a valid exception reason');
    }
    if (reason === 'Other' && !body.note?.trim()) {
      throw new AppError(400, 'Explain why this exception is being granted');
    }
    const examName = body.examName?.trim() || 'End of Term Examination';
    const draft = await this.ensureDraft(organizationId, {
      academicYear: body.academicYear,
      term: body.term,
      className: body.className,
      examName,
    });
    const preview = await this.preview(organizationId, {
      academicYear: body.academicYear,
      term: body.term,
      className: body.className,
      examName,
    });
    const student = preview.students.find((s) => s.studentId === body.studentId || s.studentCode === body.studentCode);
    if (!student) throw new AppError(404, 'Student is not in this class list');

    const decision = body.allow ? ExamDecision.MANUALLY_ALLOWED : ExamDecision.MANUALLY_BLOCKED;
    const reference = body.reference?.trim() || `EXC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const row = await prisma.examEligibilityStudent.upsert({
      where: { listId_studentId: { listId: draft.id, studentId: student.studentId } },
      create: {
        listId: draft.id,
        studentId: student.studentId,
        studentCode: student.studentCode,
        studentName: student.studentName,
        className: student.className,
        totalFees: student.totalFees,
        paidAmount: student.paidAmount,
        balance: student.balance,
        financialStatus: student.financialStatus,
        decision,
        exceptionReason: reason,
        exceptionNote: body.note?.trim() || null,
        exceptionReference: reference,
        exceptionById: actor.sub ?? null,
        exceptionByName: actorName(actor),
        exceptionAt: new Date(),
      },
      update: {
        totalFees: student.totalFees,
        paidAmount: student.paidAmount,
        balance: student.balance,
        financialStatus: student.financialStatus,
        decision,
        exceptionReason: reason,
        exceptionNote: body.note?.trim() || null,
        exceptionReference: reference,
        exceptionById: actor.sub ?? null,
        exceptionByName: actorName(actor),
        exceptionAt: new Date(),
      },
    });
    await prisma.examEligibilityAudit.create({
      data: {
        organizationId,
        listId: draft.id,
        studentId: student.studentId,
        studentCode: student.studentCode,
        action: 'MANUAL_EXCEPTION',
        decision,
        reason,
        note: body.note?.trim() || null,
        reference,
        actorId: actor.sub ?? null,
        actorName: actorName(actor),
        balance: student.balance,
      },
    });
    return row;
  },

  async publish(
    organizationId: string,
    actor: { sub?: string; email?: string; roles?: string[] },
    body: { academicYear: string; term: string; className: string; examName?: string },
  ) {
    if (!canOverride(actor.roles)) {
      throw new AppError(403, 'Only an authorized school administrator can publish examination lists.');
    }
    const examName = body.examName?.trim() || 'End of Term Examination';
    const preview = await this.preview(organizationId, { ...body, examName });
    const latest = await prisma.examEligibilityList.findFirst({
      where: {
        organizationId,
        academicYear: body.academicYear,
        term: body.term,
        className: body.className,
        examName,
      },
      orderBy: { version: 'desc' },
    });
    const nextVersion = latest
      ? (latest.status === ExamListStatus.PUBLISHED ? latest.version + 1 : latest.version)
      : 1;
    const yearShort = body.academicYear.replace(/\s+/g, '').split('-')[0] || new Date().getFullYear();
    const versionLabel = `EXAM-${yearShort}-${slugPart(body.term)}-${slugPart(body.className)}-V${nextVersion}`;

    const published = await prisma.$transaction(async (tx) => {
      const list = await tx.examEligibilityList.upsert({
        where: {
          organizationId_academicYear_term_className_examName_version: {
            organizationId,
            academicYear: body.academicYear,
            term: body.term,
            className: body.className,
            examName,
            version: nextVersion,
          },
        },
        create: {
          organizationId,
          academicYear: body.academicYear,
          term: body.term,
          className: body.className,
          examName,
          status: ExamListStatus.PUBLISHED,
          version: nextVersion,
          versionLabel,
          publishedAt: new Date(),
          publishedById: actor.sub ?? null,
          publishedByName: actorName(actor),
        },
        update: {
          status: ExamListStatus.PUBLISHED,
          versionLabel,
          publishedAt: new Date(),
          publishedById: actor.sub ?? null,
          publishedByName: actorName(actor),
        },
      });
      await tx.examEligibilityStudent.deleteMany({ where: { listId: list.id } });
      if (preview.students.length) {
        await tx.examEligibilityStudent.createMany({
          data: preview.students.map((s) => ({
            listId: list.id,
            studentId: s.studentId,
            studentCode: s.studentCode,
            studentName: s.studentName,
            className: s.className,
            totalFees: s.totalFees,
            paidAmount: s.paidAmount,
            balance: s.balance,
            financialStatus: s.financialStatus,
            decision: s.decision,
            exceptionReason: s.exceptionReason,
            exceptionNote: s.exceptionNote,
            exceptionReference: s.exceptionReference,
            exceptionByName: s.exceptionByName,
            exceptionAt: s.exceptionAt,
          })),
        });
      }
      await tx.examEligibilityAudit.create({
        data: {
          organizationId,
          listId: list.id,
          action: 'PUBLISH',
          actorId: actor.sub ?? null,
          actorName: actorName(actor),
          note: `${preview.totals.allowed} allowed · ${preview.totals.blocked} not allowed`,
          reference: versionLabel,
        },
      });
      return list;
    });
    return { list: published, totals: preview.totals, versionLabel };
  },

  async lookup(
    organizationId: string,
    query: {
      academicYear?: string;
      term?: string;
      className?: string;
      examName?: string;
      studentId?: string;
      studentCode?: string;
    },
  ) {
    const academicYear = query.academicYear?.trim();
    const term = query.term?.trim();
    const className = query.className?.trim();
    const studentCode = query.studentCode?.trim();
    const studentId = query.studentId?.trim();

    const listWhere = {
      organizationId,
      status: ExamListStatus.PUBLISHED,
      ...(academicYear ? { academicYear } : {}),
      ...(term ? { term } : {}),
      ...(className ? { className: { equals: className, mode: 'insensitive' as const } } : {}),
      ...(query.examName ? { examName: query.examName } : {}),
    };

    if (studentId || studentCode) {
      const row = await prisma.examEligibilityStudent.findFirst({
        where: {
          list: listWhere,
          OR: [
            ...(studentId ? [{ studentId }] : []),
            ...(studentCode ? [{ studentCode: { equals: studentCode, mode: 'insensitive' as const } }] : []),
          ],
        },
        include: { list: true },
        orderBy: { list: { publishedAt: 'desc' } },
      });
      if (!row) {
        const anyPublished = await prisma.examEligibilityList.findFirst({
          where: listWhere,
          orderBy: { publishedAt: 'desc' },
        });
        if (!anyPublished) {
          return {
            published: false,
            allowed: true,
            status: 'NO_LIST',
            message: 'No published examination list yet.',
          };
        }
        return {
          published: true,
          allowed: false,
          status: 'NOT_ON_LIST',
          message: 'Student is not on the published examination list.',
          versionLabel: anyPublished.versionLabel,
        };
      }
      const allowed = row.decision === ExamDecision.AUTO_ALLOWED || row.decision === ExamDecision.MANUALLY_ALLOWED;
      return {
        published: true,
        allowed,
        status: row.decision,
        financialStatus: row.financialStatus,
        balance: num(row.balance),
        reason: row.exceptionReason,
        note: row.exceptionNote,
        reference: row.exceptionReference,
        studentName: row.studentName,
        studentCode: row.studentCode,
        className: row.className,
        versionLabel: row.list.versionLabel,
        examName: row.list.examName,
        academicYear: row.list.academicYear,
        term: row.list.term,
      };
    }

    const list = await prisma.examEligibilityList.findFirst({
      where: listWhere,
      include: { students: true },
      orderBy: { publishedAt: 'desc' },
    });

    if (!list) {
      return {
        published: false,
        allowed: true,
        status: 'NO_LIST',
        message: 'No published examination list for this class yet.',
      };
    }

    return {
      published: true,
      listId: list.id,
      versionLabel: list.versionLabel,
      academicYear: list.academicYear,
      term: list.term,
      className: list.className,
      examName: list.examName,
      students: list.students.map((s) => ({
        studentId: s.studentId,
        studentCode: s.studentCode,
        allowed: s.decision === ExamDecision.AUTO_ALLOWED || s.decision === ExamDecision.MANUALLY_ALLOWED,
        status: s.decision,
        financialStatus: s.financialStatus,
        balance: num(s.balance),
        reason: s.exceptionReason,
      })),
    };
  },
};
