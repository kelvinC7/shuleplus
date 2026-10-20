import { BillStatus, FeeStructureStatus, PaymentMethod, PaymentStatus, Prisma } from '../generated/prisma';
import { prisma } from '../config/database';
import { seedService } from './seed.service';

function num(v: Prisma.Decimal | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : Number(v);
}

function billWhere(organizationId: string, q: Record<string, string | undefined>) {
  const statusFilter = q.paymentStatus?.trim().toLowerCase();
  let status: BillStatus | { in: BillStatus[] } | undefined;
  if (statusFilter === 'paid') status = BillStatus.PAID;
  else if (statusFilter === 'partial' || statusFilter === 'partially_paid') status = BillStatus.PARTIALLY_PAID;
  else if (statusFilter === 'unpaid') status = { in: [BillStatus.PENDING, BillStatus.OVERDUE] };
  else if (statusFilter === 'outstanding') {
    status = { in: [BillStatus.PARTIALLY_PAID, BillStatus.PENDING, BillStatus.OVERDUE] };
  }
  else if (statusFilter === 'overdue') status = BillStatus.OVERDUE;

  return {
    organizationId,
    status: status ?? { not: BillStatus.CANCELLED },
    ...(q.academicYear ? { academicYear: q.academicYear } : {}),
    ...(q.term ? { term: q.term } : {}),
    ...(q.className && q.className !== 'all' ? { className: q.className } : {}),
    ...(q.feeCategory
      ? {
          lineItems: {
            some: { category: q.feeCategory },
          },
        }
      : {}),
  } satisfies Prisma.StudentBillWhereInput;
}

function paymentWhere(organizationId: string, q: Record<string, string | undefined>) {
  const statusRaw = q.transactionStatus?.trim().toUpperCase();
  let status: PaymentStatus | undefined;
  if (statusRaw === 'SUCCESSFUL' || statusRaw === 'COMPLETED') status = PaymentStatus.COMPLETED;
  else if (statusRaw === 'PENDING') status = PaymentStatus.PENDING;
  else if (statusRaw === 'FAILED') status = PaymentStatus.FAILED;
  else if (statusRaw === 'REVERSED') status = PaymentStatus.REVERSED;
  const from = q.dateFrom ? new Date(q.dateFrom) : undefined;
  const to = q.dateTo ? new Date(q.dateTo) : undefined;
  if (to) to.setHours(23, 59, 59, 999);

  return {
    organizationId,
    ...(status ? { status } : {}),
    ...(q.paymentMethod && q.paymentMethod !== 'all' ? { method: q.paymentMethod as PaymentMethod } : {}),
    ...(from || to
      ? {
          paidAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
    ...((): { bill?: Prisma.StudentBillWhereInput } => {
      const bill: Prisma.StudentBillWhereInput = {};
      if (q.academicYear) bill.academicYear = q.academicYear;
      if (q.term) bill.term = q.term;
      if (q.feeCategory) bill.lineItems = { some: { category: q.feeCategory } };
      return Object.keys(bill).length ? { bill } : {};
    })(),
  } satisfies Prisma.PaymentWhereInput;
}

function mapBillPaymentStatus(status: BillStatus): 'paid' | 'partial' | 'unpaid' | 'overdue' {
  if (status === BillStatus.PAID) return 'paid';
  if (status === BillStatus.PARTIALLY_PAID) return 'partial';
  if (status === BillStatus.OVERDUE) return 'overdue';
  return 'unpaid';
}

function collectionHealth(rate: number): 'on_track' | 'needs_attention' | 'critical' {
  if (rate >= 85) return 'on_track';
  if (rate >= 60) return 'needs_attention';
  return 'critical';
}

function mapPaymentStatus(status: PaymentStatus): string {
  if (status === PaymentStatus.COMPLETED) return 'Successful';
  if (status === PaymentStatus.PENDING) return 'Pending';
  if (status === PaymentStatus.FAILED) return 'Failed';
  if (status === PaymentStatus.REVERSED) return 'Reversed';
  if (status === PaymentStatus.REFUNDED) return 'Refunded';
  return String(status);
}

export class RepresentativeReadService {
  async filterOptions(organizationId: string) {
    await seedService.ensureFeeCategories(organizationId);
    const [years, terms, classes, categories] = await Promise.all([
      prisma.studentBill.findMany({
        where: { organizationId },
        distinct: ['academicYear'],
        select: { academicYear: true },
        orderBy: { academicYear: 'desc' },
      }),
      prisma.studentBill.findMany({
        where: { organizationId },
        distinct: ['term'],
        select: { term: true },
      }),
      prisma.studentBill.findMany({
        where: { organizationId },
        distinct: ['className'],
        select: { className: true },
        orderBy: { className: 'asc' },
      }),
      prisma.feeCategory.findMany({
        where: { organizationId, isActive: true },
        select: { code: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      academicYears: years.map((y) => y.academicYear).filter(Boolean),
      terms: terms.map((t) => t.term).filter(Boolean),
      classes: classes.map((c) => c.className).filter(Boolean),
      feeCategories: categories.map((c) => ({ code: c.code, name: c.name })),
      paymentMethods: Object.values(PaymentMethod),
    };
  }

  async overview(organizationId: string, q: Record<string, string | undefined>) {
    await seedService.ensureFeeCategories(organizationId);
    const where = billWhere(organizationId, q);

    const bills = await prisma.studentBill.findMany({
      where,
      include: { lineItems: true },
    });

    const paymentQuery = paymentWhere(organizationId, q);
    const payments = await prisma.payment.findMany({
      where: {
        ...paymentQuery,
        status: PaymentStatus.COMPLETED,
      },
      include: { bill: { include: { lineItems: true } } },
    });

    const expected = bills.reduce((s, b) => s + num(b.netAmount), 0);
    const collected = payments.reduce((s, p) => s + num(p.amount), 0);
    const outstanding = bills.reduce((s, b) => s + num(b.balance), 0);
    const rate = expected > 0 ? Math.round((collected / expected) * 1000) / 10 : 0;

    const paidStudents = new Set(bills.filter((b) => b.status === BillStatus.PAID).map((b) => b.studentId)).size;
    const partialStudents = new Set(
      bills.filter((b) => b.status === BillStatus.PARTIALLY_PAID).map((b) => b.studentId)
    ).size;
    const unpaidStudents = new Set(
      bills.filter((b) => b.status === BillStatus.PENDING).map((b) => b.studentId)
    ).size;
    const overdueStudents = new Set(
      bills.filter((b) => b.status === BillStatus.OVERDUE).map((b) => b.studentId)
    ).size;

    const categoryMap: Record<string, { expected: number; collected: number }> = {};
    for (const b of bills) {
      for (const li of b.lineItems) {
        const cat = li.category || 'Other';
        if (!categoryMap[cat]) categoryMap[cat] = { expected: 0, collected: 0 };
        categoryMap[cat].expected += num(li.amount);
      }
    }
    for (const p of payments) {
      const cats = p.bill?.lineItems?.map((li) => li.category).filter(Boolean) ?? ['School Fees'];
      const share = num(p.amount) / cats.length;
      for (const cat of cats) {
        if (!categoryMap[cat]) categoryMap[cat] = { expected: 0, collected: 0 };
        categoryMap[cat].collected += share;
      }
    }

    const trendMap = new Map<string, number>();
    for (const p of payments) {
      const key = p.paidAt.toISOString().slice(0, 10);
      trendMap.set(key, (trendMap.get(key) ?? 0) + num(p.amount));
    }
    const collectionTrend = [...trendMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, amount]) => ({ date, amount }));

    const statusDistribution = [
      { status: 'Paid', count: paidStudents },
      { status: 'Partial', count: partialStudents },
      { status: 'Unpaid', count: unpaidStudents },
      { status: 'Overdue', count: overdueStudents },
    ];

    return {
      currency: 'RWF',
      summary: {
        totalExpected: expected,
        totalCollected: collected,
        outstanding,
        collectionRate: rate,
        studentStatus: {
          paid: paidStudents,
          partial: partialStudents,
          unpaid: unpaidStudents,
          overdue: overdueStudents,
        },
      },
      collectionByCategory: Object.entries(categoryMap).map(([category, v]) => ({
        category,
        expected: v.expected,
        collected: v.collected,
        outstanding: Math.max(0, v.expected - v.collected),
      })),
      collectionTrend,
      statusDistribution,
      health: collectionHealth(rate),
      studentsWithOutstanding: partialStudents + unpaidStudents + overdueStudents,
    };
  }

  async transactions(
    organizationId: string,
    q: Record<string, string | undefined> & { page?: string; pageSize?: string }
  ) {
    const page = Math.max(1, parseInt(q.page ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(5, parseInt(q.pageSize ?? '20', 10) || 20));
    const search = q.search?.trim().toLowerCase();

    const where = paymentWhere(organizationId, q);
    const all = await prisma.payment.findMany({
      where,
      include: { receipt: true, bill: { include: { lineItems: true } } },
      orderBy: { paidAt: 'desc' },
    });

    let rows = all.map((p) => ({
      id: p.id,
      receiptNumber: p.receipt?.receiptNumber ?? null,
      paymentNumber: p.paymentNumber,
      paidAt: p.paidAt.toISOString(),
      schoolId: organizationId,
      studentName: p.studentName,
      studentCode: p.receipt?.studentCode ?? p.bill?.studentCode ?? p.studentId,
      academicYear: p.bill?.academicYear ?? null,
      term: p.bill?.term ?? null,
      feeCategory: p.bill?.lineItems?.[0]?.category ?? 'School Fees',
      amount: num(p.amount),
      method: String(p.method).replace(/_/g, ' '),
      reference: p.reference,
      status: mapPaymentStatus(p.status),
      recordedBy: p.payerName ?? 'School Finance',
    }));

    if (search) {
      rows = rows.filter((r) => {
        const hay = `${r.receiptNumber ?? ''} ${r.paymentNumber} ${r.studentName} ${r.studentCode} ${r.reference ?? ''}`.toLowerCase();
        return hay.includes(search);
      });
    }

    const total = rows.length;
    const items = rows.slice((page - 1) * pageSize, page * pageSize);

    return {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      items,
    };
  }

  async balances(
    organizationId: string,
    q: Record<string, string | undefined> & { page?: string; pageSize?: string }
  ) {
    const page = Math.max(1, parseInt(q.page ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(5, parseInt(q.pageSize ?? '20', 10) || 20));
    const search = q.search?.trim().toLowerCase();

    const bills = await prisma.studentBill.findMany({
      where: billWhere(organizationId, q),
      orderBy: { balance: 'desc' },
    });

    let rows = bills.map((b) => ({
      id: b.id,
      studentId: b.studentId,
      studentCode: b.studentCode,
      studentName: b.studentName,
      className: b.className,
      schoolId: organizationId,
      expected: num(b.netAmount),
      paid: num(b.paidAmount),
      balance: num(b.balance),
      status: mapBillPaymentStatus(b.status),
      lastPaymentAt: b.updatedAt.toISOString(),
      academicYear: b.academicYear,
      term: b.term,
      dueDate: b.dueDate?.toISOString() ?? null,
    }));

    if (search) {
      rows = rows.filter((r) => {
        const hay = `${r.studentName} ${r.studentCode} ${r.className ?? ''}`.toLowerCase();
        return hay.includes(search);
      });
    }

    const total = rows.length;
    const items = rows.slice((page - 1) * pageSize, page * pageSize);
    const summary = {
      paid: rows.filter((r) => r.status === 'paid').length,
      partial: rows.filter((r) => r.status === 'partial').length,
      unpaid: rows.filter((r) => r.status === 'unpaid').length,
      overdue: rows.filter((r) => r.status === 'overdue').length,
      totalStudents: total,
    };

    return {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      summary,
      items,
    };
  }

  async classAnalytics(organizationId: string, q: Record<string, string | undefined>) {
    await seedService.ensureFeeCategories(organizationId);
    const bills = await prisma.studentBill.findMany({
      where: billWhere(organizationId, q),
      select: {
        className: true,
        status: true,
        netAmount: true,
        paidAmount: true,
        balance: true,
      },
    });

    type ClassRow = {
      className: string;
      paid: number;
      partial: number;
      unpaid: number;
      overdue: number;
      expected: number;
      collected: number;
      outstanding: number;
      overdueAmount: number;
      exempted: number;
    };

    const map = new Map<string, ClassRow>();

    for (const b of bills) {
      const cls = b.className?.trim() || 'Unassigned';
      const row = map.get(cls) ?? {
        className: cls,
        paid: 0,
        partial: 0,
        unpaid: 0,
        overdue: 0,
        expected: 0,
        collected: 0,
        outstanding: 0,
        overdueAmount: 0,
        exempted: 0,
      };
      if (b.status === BillStatus.CANCELLED) {
        row.exempted += 1;
        map.set(cls, row);
        continue;
      }
      const st = mapBillPaymentStatus(b.status);
      if (st === 'paid') row.paid += 1;
      else if (st === 'partial') row.partial += 1;
      else if (st === 'overdue') row.overdue += 1;
      else row.unpaid += 1;
      row.expected += num(b.netAmount);
      row.collected += num(b.paidAmount);
      row.outstanding += num(b.balance);
      if (st === 'overdue') row.overdueAmount = (row.overdueAmount ?? 0) + num(b.balance);
      map.set(cls, row);
    }

    const byClass = [...map.values()]
      .map((r) => {
        const students = r.paid + r.partial + r.unpaid + r.overdue;
        return {
          ...r,
          students,
          collectionRate: r.expected > 0 ? Math.round((r.collected / r.expected) * 1000) / 10 : 0,
        };
      })
      .sort((a, b) => a.className.localeCompare(b.className));

    const summary = byClass.reduce(
      (acc, r) => {
        acc.students += r.students;
        acc.paid += r.paid;
        acc.partial += r.partial;
        acc.unpaid += r.unpaid;
        acc.overdue += r.overdue;
        acc.expected += r.expected;
        acc.collected += r.collected;
        acc.outstanding += r.outstanding;
        acc.overdueAmount += r.overdueAmount ?? 0;
        acc.exempted += r.exempted ?? 0;
        return acc;
      },
      {
        students: 0,
        paid: 0,
        partial: 0,
        unpaid: 0,
        overdue: 0,
        expected: 0,
        collected: 0,
        outstanding: 0,
        overdueAmount: 0,
        exempted: 0,
        collectionRate: 0,
      }
    );
    summary.collectionRate =
      summary.expected > 0 ? Math.round((summary.collected / summary.expected) * 1000) / 10 : 0;

    return {
      currency: 'RWF',
      metricsSource: bills.length ? ('school-fees-portal' as const) : ('empty' as const),
      summary,
      byClass,
      chartStatusByClass: byClass.map((r) => ({
        className: r.className,
        Paid: r.paid,
        Partial: r.partial,
        Unpaid: r.unpaid,
        Overdue: r.overdue,
      })),
      chartCollectionByClass: byClass.map((r) => ({
        className: r.className,
        expected: r.expected,
        collected: r.collected,
        outstanding: r.outstanding,
      })),
    };
  }

  async feeStructures(organizationId: string, q: Record<string, string | undefined>) {
    await seedService.ensureFeeCategories(organizationId);
    const where: Prisma.FeeStructureWhereInput = { organizationId };
    if (q.academicYear) where.academicYear = q.academicYear;
    if (q.term) where.term = q.term;
    if (q.className && q.className !== 'all') where.className = q.className;
    if (q.status && q.status !== 'all') {
      where.status = q.status.toUpperCase() as FeeStructureStatus;
    }
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { code: { contains: s, mode: 'insensitive' } },
        { className: { contains: s, mode: 'insensitive' } },
      ];
    }

    const rows = await prisma.feeStructure.findMany({
      where,
      include: {
        items: { include: { category: { select: { name: true, code: true } } } },
        _count: { select: { bills: true } },
      },
      orderBy: [{ academicYear: 'desc' }, { term: 'asc' }, { className: 'asc' }],
    });

    return {
      integrationSource: 'school_fees_portal_and_student_management' as const,
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        academicYear: r.academicYear,
        term: r.term,
        className: r.className,
        status: r.status,
        totalAmount: num(r.totalAmount),
        itemCount: r.items.length,
        billsGenerated: r._count.bills,
        updatedAt: r.updatedAt.toISOString(),
        items: r.items.map((i) => ({
          id: i.id,
          name: i.name,
          amount: num(i.amount),
          category: i.category.name,
          categoryCode: i.category.code,
          source: i.source,
          itemType: i.itemType,
        })),
        hasBabyeyiItems: r.items.some((i) => i.source === 'BABYEYI'),
        hasSchoolItems: r.items.some((i) => i.source === 'SCHOOL'),
      })),
    };
  }

  async studentBills(
    organizationId: string,
    q: Record<string, string | undefined> & { page?: string; pageSize?: string }
  ) {
    const page = Math.max(1, parseInt(q.page ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(5, parseInt(q.pageSize ?? '20', 10) || 20));
    const search = q.search?.trim().toLowerCase();

    const bills = await prisma.studentBill.findMany({
      where: billWhere(organizationId, q),
      include: {
        structure: { select: { id: true, name: true, code: true } },
        lineItems: { select: { id: true, category: true, amount: true } },
        _count: { select: { payments: true } },
      },
      orderBy: { billedAt: 'desc' },
    });

    let rows = bills.map((b) => ({
      id: b.id,
      billNumber: b.billNumber,
      studentId: b.studentId,
      studentCode: b.studentCode,
      studentName: b.studentName,
      className: b.className,
      academicYear: b.academicYear,
      term: b.term,
      status: mapBillPaymentStatus(b.status),
      grossAmount: num(b.grossAmount),
      netAmount: num(b.netAmount),
      paidAmount: num(b.paidAmount),
      balance: num(b.balance),
      dueDate: b.dueDate?.toISOString() ?? null,
      billedAt: b.billedAt.toISOString(),
      structureName: b.structure?.name ?? null,
      structureCode: b.structure?.code ?? null,
      lineItemCount: b.lineItems.length,
      paymentCount: b._count.payments,
      schoolId: organizationId,
    }));

    if (search) {
      rows = rows.filter((r) => {
        const hay = `${r.billNumber} ${r.studentName} ${r.studentCode} ${r.className}`.toLowerCase();
        return hay.includes(search);
      });
    }

    const total = rows.length;
    const summary = {
      paid: rows.filter((r) => r.status === 'paid').length,
      partial: rows.filter((r) => r.status === 'partial').length,
      unpaid: rows.filter((r) => r.status === 'unpaid').length,
      overdue: rows.filter((r) => r.status === 'overdue').length,
      totalBills: total,
    };

    return {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      summary,
      items: rows.slice((page - 1) * pageSize, page * pageSize),
    };
  }
}

export const representativeReadService = new RepresentativeReadService();
