import { BillStatus, FeeStructureStatus, PaymentMethod, PaymentStatus, Prisma } from '../generated/prisma';
import { prisma } from '../config/database';
import { receiptPublicUrl } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import { seedService } from './seed.service';
import { structureService } from './structure.service';
import { paymentNotificationService } from './payment-notification.service';
import { studentManagementClient } from '../clients/student-management.client';

function num(v: Prisma.Decimal | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : Number(v);
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
  const compact = name.trim().toLowerCase().replace(/\s+/g, '');
  const match = compact.match(/^([a-z]+\d+)[a-z]?$/);
  return match ? match[1] : compact;
}

function classMatches(structureClass: string | null | undefined, studentClass: string) {
  const a = (structureClass ?? '').trim();
  const b = studentClass.trim();
  if (!a) return true;
  if (!b) return false;
  if (a.toLowerCase() === b.toLowerCase()) return true;
  return classFamily(a) === classFamily(b);
}

async function ensureCategories(organizationId: string) {
  await seedService.ensureFeeCategories(organizationId);
}

export type CollectionStatus = 'PAID' | 'PARTIAL' | 'NOT_PAID' | 'OVERDUE';

function displayStatus(bill: {
  netAmount: Prisma.Decimal;
  paidAmount: Prisma.Decimal;
  balance: Prisma.Decimal;
  dueDate: Date | null;
}): CollectionStatus {
  const paid = num(bill.paidAmount);
  const balance = num(bill.balance);
  const total = num(bill.netAmount);
  const now = new Date();
  if (balance <= 0 || (total > 0 && paid >= total)) return 'PAID';
  if (bill.dueDate && balance > 0 && bill.dueDate < now) return 'OVERDUE';
  if (paid > 0 && balance > 0) return 'PARTIAL';
  return 'NOT_PAID';
}

function rowUniqueId(studentId: string, billId: string | null) {
  return `${studentId}::${billId ?? 'account'}`;
}

function billToRow(
  b: {
    id: string;
    studentId: string;
    studentCode: string;
    studentName: string;
    className: string | null;
    academicYear: string;
    term: string;
    netAmount: Prisma.Decimal;
    paidAmount: Prisma.Decimal;
    balance: Prisma.Decimal;
    dueDate: Date | null;
    structureId: string | null;
    payments: Array<{
      paidAt: Date;
      method: PaymentMethod;
      receipt: { receiptNumber: string } | null;
    }>;
  },
  enrich?: { fullName?: string; className?: string | null; rowStudentId?: string }
) {
  const status = displayStatus(b);
  const lastPay = b.payments[0];
  const studentId = enrich?.rowStudentId ?? b.studentId;
  const studentName =
    enrich?.fullName?.trim() ||
    (b.studentName.trim() && b.studentName !== 'Student' ? b.studentName : b.studentCode);
  return {
    id: rowUniqueId(studentId, b.id),
    studentId,
    studentCode: b.studentCode,
    studentName,
    className: enrich?.className ?? b.className,
    academicYear: b.academicYear,
    term: b.term,
    totalFees: num(b.netAmount),
    paid: num(b.paidAmount),
    remaining: num(b.balance),
    lastPaymentAt: lastPay?.paidAt ?? null,
    lastPaymentMethod: lastPay?.method ?? null,
    lastReceiptNumber: lastPay?.receipt?.receiptNumber ?? null,
    displayStatus: status,
    dueDate: b.dueDate,
    billId: b.id,
    structureId: b.structureId,
  };
}

function emptyStudentRow(
  s: { id: string; studentCode: string; fullName: string; className: string | null },
  academicYear: string,
  term: string,
  expectedFees = 0,
  structureId: string | null = null,
) {
  return {
    id: rowUniqueId(s.id, null),
    studentId: s.id,
    studentCode: s.studentCode,
    studentName: s.fullName,
    className: s.className,
    academicYear,
    term,
    totalFees: expectedFees,
    paid: 0,
    remaining: expectedFees,
    lastPaymentAt: null as Date | null,
    lastPaymentMethod: null as PaymentMethod | null,
    lastReceiptNumber: null as string | null,
    displayStatus: 'NOT_PAID' as CollectionStatus,
    dueDate: null as Date | null,
    billId: null as string | null,
    structureId,
  };
}

function withStructureFees<T extends { totalFees: number; paid: number; remaining: number; displayStatus: CollectionStatus; structureId: string | null }>(
  row: T,
  expectedFees: number,
  structureId: string | null,
): T {
  if (expectedFees <= 0) return row;
  const totalFees = row.totalFees > 0 ? row.totalFees : expectedFees;
  const remaining = Math.max(0, totalFees - row.paid);
  const displayStatus: CollectionStatus =
    remaining <= 0 && totalFees > 0
      ? 'PAID'
      : row.paid > 0
        ? 'PARTIAL'
        : row.displayStatus === 'OVERDUE'
          ? 'OVERDUE'
          : 'NOT_PAID';
  return {
    ...row,
    totalFees,
    remaining,
    displayStatus,
    structureId: row.structureId ?? structureId,
  };
}

function dedupeRows(rows: Array<ReturnType<typeof billToRow> | ReturnType<typeof emptyStudentRow>>) {
  const map = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const key = rowUniqueId(row.studentId, row.billId);
    if (!map.has(key)) map.set(key, { ...row, id: key });
  }
  return [...map.values()];
}

export class FeeCollectionService {
  async overview(organizationId: string, query: Record<string, string | undefined>) {
    await ensureCategories(organizationId);

    const academicYear = query.academicYear?.trim() && query.academicYear !== 'all' ? query.academicYear.trim() : '';
    const term = query.term?.trim() && query.term !== 'all' ? query.term.trim() : '';
    const className = query.className?.trim() && query.className !== 'all' ? query.className.trim() : '';

    const smQuery: Record<string, string> = { status: 'ACTIVE' };
    if (className) {
      const family = classFamily(className);
      const isStream = className.trim().toLowerCase().replace(/\s+/g, '') !== family;
      if (isStream) smQuery.className = className;
    }
    if (query.search?.trim()) smQuery.search = query.search.trim();

    let students = await studentManagementClient.searchStudents(organizationId, smQuery);
    if (className) {
      students = students.filter((s) => classMatches(className, s.className ?? ''));
    }

    const studentById = new Map(students.map((s) => [s.id, s]));
    const studentByCode = new Map(students.map((s) => [s.studentCode?.toLowerCase(), s]));

    const where: Prisma.StudentBillWhereInput = {
      organizationId,
      status: { not: BillStatus.CANCELLED },
    };
    if (academicYear) where.academicYear = { contains: academicYear, mode: 'insensitive' };
    if (term) where.term = { contains: term, mode: 'insensitive' };

    const structures = await prisma.feeStructure.findMany({
      where: {
        organizationId,
        status: { in: [FeeStructureStatus.ACTIVE, FeeStructureStatus.DRAFT] },
      },
      include: { items: true },
      orderBy: [{ version: 'desc' }],
    });

    const structureForClass = (studentClass: string | null) => {
      const matches = structures
        .filter((s) => {
          if (academicYear && normalizeYear(s.academicYear) !== normalizeYear(academicYear)) return false;
          if (term && normalizeTerm(s.term) !== normalizeTerm(term)) return false;
          if (studentClass && !classMatches(s.className, studentClass)) return false;
          if (className && studentClass && !classMatches(className, studentClass) && !classMatches(s.className, className)) {
            return false;
          }
          return true;
        })
        .sort((a, b) => {
          const target = (studentClass || className || '').toLowerCase();
          const aExact = (a.className ?? '').trim().toLowerCase() === target ? 1 : 0;
          const bExact = (b.className ?? '').trim().toLowerCase() === target ? 1 : 0;
          if (bExact !== aExact) return bExact - aExact;
          if (a.status !== b.status) return a.status === FeeStructureStatus.ACTIVE ? -1 : 1;
          return b.version - a.version;
        });
      const match = matches[0];
      if (!match) return { total: 0, id: null as string | null, academicYear: '', term: '' };
      const total = num(match.totalAmount) || match.items.reduce((sum, item) => sum + num(item.amount), 0);
      return { total, id: match.id, academicYear: match.academicYear, term: match.term };
    };

    const bills = await prisma.studentBill.findMany({
      where,
      include: {
        lineItems: true,
        payments: {
          where: { status: PaymentStatus.COMPLETED },
          orderBy: { paidAt: 'desc' },
          take: 1,
          include: { receipt: true },
        },
      },
    });

    const billByStudentId = new Map<string, (typeof bills)[number]>();
    const billByCode = new Map<string, (typeof bills)[number]>();
    for (const b of bills) {
      billByStudentId.set(b.studentId, b);
      billByCode.set(b.studentCode.toLowerCase(), b);
    }

    const seen = new Set<string>();
    type OverviewRow = ReturnType<typeof billToRow> | ReturnType<typeof emptyStudentRow>;
    let rows: OverviewRow[] = [];

    const seenBillIds = new Set<string>();

    const applyExpected = <T extends OverviewRow>(row: T): T => {
      const expected = structureForClass(row.className);
      const next = withStructureFees(row, expected.total, expected.id);
      return {
        ...next,
        academicYear: next.academicYear || expected.academicYear,
        term: next.term || expected.term,
      };
    };

    for (const s of students) {
      seen.add(s.id);
      seen.add(s.studentCode?.toLowerCase() ?? '');
      const bill = billByStudentId.get(s.id) ?? billByCode.get(s.studentCode?.toLowerCase() ?? '');
      const expected = structureForClass(s.className);
      if (bill) {
        if (seenBillIds.has(bill.id)) continue;
        seenBillIds.add(bill.id);
        rows.push(
          applyExpected(
            billToRow(bill, {
              fullName: s.fullName,
              className: s.className ?? bill.className,
              rowStudentId: s.id,
            })
          )
        );
      } else {
        rows.push(
          emptyStudentRow(s, academicYear || expected.academicYear, term || expected.term, expected.total, expected.id)
        );
      }
    }

    for (const b of bills) {
      if (seenBillIds.has(b.id)) continue;
      const linkedByStudent =
        seen.has(b.studentId) || seen.has(b.studentCode?.toLowerCase() ?? '');
      if (linkedByStudent) continue;
      if (className && !classMatches(className, b.className ?? '')) continue;

      let enrich =
        studentById.get(b.studentId) ??
        studentByCode.get(b.studentCode?.toLowerCase() ?? '');
      if (!enrich && b.studentCode) {
        enrich =
          (await studentManagementClient.lookupStudentByCode(organizationId, b.studentCode)) ?? undefined;
      }
      seenBillIds.add(b.id);
      rows.push(
        applyExpected(
          billToRow(b, enrich ? { fullName: enrich.fullName, className: enrich.className ?? b.className, rowStudentId: enrich.id } : undefined)
        )
      );
    }

    if (query.search?.trim() && students.length === 0) {
      const q = query.search.trim().toLowerCase();
      rows = bills
        .filter(
          (b) =>
            b.studentName.toLowerCase().includes(q) ||
            b.studentCode.toLowerCase().includes(q) ||
            b.studentId.toLowerCase().includes(q)
        )
        .map((b) => applyExpected(billToRow(b)));
    }

    if (query.method?.trim() && query.method !== 'all') {
      rows = rows.filter((r) => r.lastPaymentMethod === query.method);
    }

    if (query.dateFrom?.trim()) {
      const from = new Date(query.dateFrom);
      rows = rows.filter((r) => r.lastPaymentAt && r.lastPaymentAt >= from);
    }
    if (query.dateTo?.trim()) {
      const to = new Date(query.dateTo);
      to.setHours(23, 59, 59, 999);
      rows = rows.filter((r) => r.lastPaymentAt && r.lastPaymentAt <= to);
    }

    let statusFiltered = rows;
    if (query.paymentStatus?.trim() && query.paymentStatus !== 'all') {
      const key = query.paymentStatus.toUpperCase().replace(/\s+/g, '_');
      if (key === 'PARTIALLY_PAID') statusFiltered = rows.filter((r) => r.displayStatus === 'PARTIAL');
      else statusFiltered = rows.filter((r) => r.displayStatus === key);
    }

    statusFiltered.sort((a, b) => a.studentName.localeCompare(b.studentName));
    statusFiltered = dedupeRows(statusFiltered);

    const totalExpected = statusFiltered.reduce((s, r) => s + r.totalFees, 0);
    const totalPaid = statusFiltered.reduce((s, r) => s + r.paid, 0);
    const remaining = statusFiltered.reduce((s, r) => s + r.remaining, 0);
    const studentsPaid = statusFiltered.filter((r) => r.displayStatus === 'PAID').length;
    const studentsPartial = statusFiltered.filter((r) => r.displayStatus === 'PARTIAL').length;
    const studentsNotPaid = statusFiltered.filter((r) => r.displayStatus === 'NOT_PAID' || r.displayStatus === 'OVERDUE').length;
    const studentsWithBalance = statusFiltered.filter((r) => r.remaining > 0).length;

    return {
      summary: {
        totalExpected,
        totalPaid,
        remaining,
        studentsPaid,
        studentsPartial,
        studentsNotPaid,
        studentsWithBalance,
      },
      rows: statusFiltered,
    };
  }

  exportCsv(rows: Awaited<ReturnType<FeeCollectionService['overview']>>['rows']) {
    const header =
      'Student Code,Student Name,Class,Academic Year,Term,Total Fees,Paid,Remaining,Last Payment,Status,Receipt';
    const lines = rows.map((r) =>
      [
        r.studentCode,
        `"${r.studentName.replace(/"/g, '""')}"`,
        r.className,
        r.academicYear,
        r.term,
        r.totalFees,
        r.paid,
        r.remaining,
        r.lastPaymentAt ? new Date(r.lastPaymentAt).toISOString() : '',
        r.displayStatus,
        r.lastReceiptNumber ?? '',
      ].join(',')
    );
    return [header, ...lines].join('\n');
  }

  async lookupStudent(organizationId: string, search: string) {
    const q = search.trim();
    if (!q) return [];

    const seen = new Set<string>();
    const results: Array<{
      studentId: string;
      studentCode: string;
      studentName: string;
      className: string | null;
      academicYear: string | null;
      term: string | null;
      billId: string | null;
    }> = [];

    async function appendFromSm(s: {
      id: string;
      studentCode: string;
      fullName: string;
      className: string | null;
    }) {
      const key = s.studentCode || s.id;
      if (seen.has(key)) return;
      seen.add(key);

      const bill = await prisma.studentBill.findFirst({
        where: {
          organizationId,
          status: { not: BillStatus.CANCELLED },
          OR: [{ studentId: s.id }, { studentCode: s.studentCode }],
        },
        orderBy: { billedAt: 'desc' },
      });

      results.push({
        studentId: s.id,
        studentCode: s.studentCode,
        studentName: s.fullName,
        className: s.className,
        academicYear: bill?.academicYear ?? null,
        term: bill?.term ?? null,
        billId: bill?.id ?? null,
      });
    }

    const publicRow = await studentManagementClient.publicLookupStudent(q);
    if (publicRow && publicRow.organizationId === organizationId) {
      await appendFromSm({
        id: publicRow.id,
        studentCode: publicRow.studentCode ?? publicRow.studentUid,
        fullName: publicRow.fullName,
        className: publicRow.className ?? publicRow.classLabel,
      });
    }

    const students = await studentManagementClient.searchStudents(organizationId, {
      search: q,
      status: 'ALL',
    });

    for (const s of students) {
      await appendFromSm(s);
      if (results.length >= 10) break;
    }

    if (results.length === 0) {
      const exact = await studentManagementClient.lookupStudentByCode(organizationId, q);
      if (exact) await appendFromSm(exact);
    }

    return results.slice(0, 10);
  }

  async studentAccount(
    organizationId: string,
    params: {
      studentCode: string;
      academicYear: string;
      term: string;
      className?: string;
      studentName?: string;
    }
  ) {
    const resolved = await structureService.resolveStudentFees({
      organizationId,
      studentCode: params.studentCode,
      studentId: params.studentCode,
      studentName: params.studentName,
      className: params.className,
      academicYear: params.academicYear,
      term: params.term,
      autoBill: true,
    });

    if (!resolved.found) return resolved;

    const bill = resolved.billId
      ? await prisma.studentBill.findFirst({
          where: { id: resolved.billId },
          include: { lineItems: true },
        })
      : null;

    const paidRatio =
      bill && num(bill.netAmount) > 0 ? num(bill.paidAmount) / num(bill.netAmount) : 0;

    const feeBreakdown = (bill?.lineItems ?? []).map((li) => {
      const amount = num(li.amount);
      const paid = Math.round(amount * paidRatio);
      return {
        id: li.id,
        description: li.description,
        amount,
        paid,
        remaining: Math.max(0, amount - paid),
      };
    });

    const payments = bill
      ? await prisma.payment.findMany({
          where: { organizationId, billId: bill.id, status: PaymentStatus.COMPLETED },
          include: { receipt: true },
          orderBy: { paidAt: 'desc' },
          take: 20,
        })
      : [];

    return {
      ...resolved,
      feeBreakdown,
      progress: resolved.total > 0 ? Math.round((resolved.paid / resolved.total) * 100) : 0,
      payments: payments.map((p) => ({
        id: p.id,
        amount: num(p.amount),
        method: p.method,
        paidAt: p.paidAt,
        reference: p.reference,
        receiptNumber: p.receipt?.receiptNumber ?? null,
        receiptId: p.receipt?.id ?? null,
      })),
    };
  }

  async recordPayment(organizationId: string, body: Record<string, unknown>) {
    const amount = Number(body.amount);
    if (!amount || amount <= 0) throw new AppError(400, 'Amount must be positive');

    const billId = body.billId ? String(body.billId) : null;
    const allocation = body.allocation as Array<{ lineItemId: string; amount: number }> | undefined;
    const paidAt = body.paidAt ? new Date(String(body.paidAt)) : new Date();

    const count = await prisma.payment.count({ where: { organizationId } });
    const paymentNumber = `PAY-2026-${String(count + 1).padStart(5, '0')}`;
    const receiptNumber = `RC-2026-${String(count + 1).padStart(5, '0')}`;

    let balanceAfter = 0;
    if (billId) {
      const bill = await prisma.studentBill.findFirst({ where: { id: billId, organizationId } });
      if (!bill) throw new AppError(404, 'Bill not found');
      const paid = num(bill.paidAmount) + amount;
      balanceAfter = Math.max(num(bill.netAmount) - paid, 0);
      await prisma.studentBill.update({
        where: { id: billId },
        data: {
          paidAmount: paid,
          balance: balanceAfter,
          status: balanceAfter <= 0 ? BillStatus.PAID : BillStatus.PARTIALLY_PAID,
        },
      });
    }

    const notes =
      allocation?.length
        ? JSON.stringify({ allocation, allocationMode: body.allocationMode ?? 'manual' })
        : body.notes
          ? String(body.notes)
          : null;

    const payment = await prisma.payment.create({
      data: {
        organizationId,
        paymentNumber,
        billId,
        studentId: String(body.studentId),
        studentName: String(body.studentName),
        className: body.className ? String(body.className) : null,
        amount,
        method: (body.method as PaymentMethod) ?? PaymentMethod.CASH,
        status: PaymentStatus.COMPLETED,
        reference: body.reference ? String(body.reference) : null,
        payerName: body.payerName ? String(body.payerName) : null,
        isPartial: Boolean(body.isPartial ?? balanceAfter > 0),
        notes,
        paidAt,
        verifiedAt: new Date(),
        receipt: {
          create: {
            organizationId,
            receiptNumber,
            studentName: String(body.studentName),
            studentCode: body.studentCode ? String(body.studentCode) : null,
            className: body.className ? String(body.className) : null,
            amountPaid: amount,
            outstanding: balanceAfter,
            method: String(body.method ?? 'CASH'),
            qrCode: receiptPublicUrl(receiptNumber),
            issuedAt: paidAt,
          },
        },
      },
      include: { receipt: true },
    });

    void paymentNotificationService
      .notifyPayment(organizationId, {
        studentId: String(body.studentId),
        studentCode: body.studentCode ? String(body.studentCode) : null,
        studentName: String(body.studentName),
        className: body.className ? String(body.className) : null,
        academicYear: body.academicYear ? String(body.academicYear) : null,
        term: body.term ? String(body.term) : null,
        amount,
        previousBalance: balanceAfter + amount,
        remainingBalance: balanceAfter,
        method: String(body.method ?? 'CASH'),
        paymentId: payment.id,
        paymentNumber,
        receiptNumber,
        paidAt,
        recordedBy: body.recordedBy ? String(body.recordedBy) : 'School Finance Office',
      })
      .catch((err) => console.warn('[fee-collection] parent payment notify failed', err));

    return {
      payment,
      receipt: payment.receipt,
      receiptNumber,
      receiptId: payment.receipt?.id ?? null,
      balanceAfter,
      previousBalance: balanceAfter + amount,
      accountStatus: balanceAfter <= 0 ? 'PAID' : 'PARTIAL',
    };
  }
}

export const feeCollectionService = new FeeCollectionService();
