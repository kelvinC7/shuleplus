import { BillStatus, InstallmentStatus, PaymentStatus, Prisma } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { seedService } from './seed.service';
import { notificationClient } from '../clients/notification.client';
import { parentMisClient } from '../clients/parent-mis.client';
import { studentManagementClient } from '../clients/student-management.client';
import { fetchIamOrganizationProfile, resolveIamAssetUrl } from '../clients/iam.client';
import { receiptPublicUrl } from '../config/env';

function num(v: Prisma.Decimal | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : Number(v);
}

async function ensureCategories(organizationId: string) {
  await seedService.ensureFeeCategories(organizationId);
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysBetween(a: Date, b: Date) {
  return Math.floor((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);
}

export type RiskLevel = 'NORMAL' | 'ATTENTION' | 'AT_RISK' | 'CRITICAL';

export function computeRisk(input: {
  balance: number;
  dueDate?: Date | null;
  daysOverdue?: number;
  missedInstallments?: number;
}): RiskLevel {
  const overdue = input.daysOverdue ?? (input.dueDate ? Math.max(0, daysBetween(input.dueDate, new Date())) : 0);
  if (overdue > 60 || (overdue > 30 && input.balance >= 100_000)) return 'CRITICAL';
  if (overdue > 14 || (input.missedInstallments ?? 0) >= 2) return 'AT_RISK';
  if (input.dueDate) {
    const daysUntil = daysBetween(new Date(), input.dueDate);
    if (daysUntil >= 0 && daysUntil <= 7) return 'ATTENTION';
  }
  if (overdue > 0) return 'AT_RISK';
  return 'NORMAL';
}

function mapPlanRow(plan: {
  id: string;
  studentId: string;
  studentName: string;
  className: string | null;
  planName: string;
  frequency: string;
  totalAmount: Prisma.Decimal;
  paidAmount: Prisma.Decimal;
  remaining: Prisma.Decimal;
  status: InstallmentStatus;
  installments: Array<{
    id: string;
    sequence: number;
    dueDate: Date;
    amount: Prisma.Decimal;
    paidAmount: Prisma.Decimal;
    status: InstallmentStatus;
    paidAt: Date | null;
  }>;
}) {
  const total = num(plan.totalAmount);
  const paid = num(plan.paidAmount);
  const remaining = num(plan.remaining);
  const progress = total > 0 ? Math.round((paid / total) * 100) : 0;

  const unpaid = plan.installments.filter((i) => num(i.paidAmount) < num(i.amount));
  const next = unpaid.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];
  const now = new Date();
  let displayStatus = 'On Track';
  if (plan.status === InstallmentStatus.COMPLETED || remaining <= 0) displayStatus = 'Completed';
  else if (next && next.dueDate < now) displayStatus = 'Overdue';
  else if (next && daysBetween(now, next.dueDate) <= 7) displayStatus = 'Due Soon';

  return {
    id: plan.id,
    studentId: plan.studentId,
    studentName: plan.studentName,
    className: plan.className,
    planName: plan.planName,
    frequency: plan.frequency,
    totalAmount: total,
    paidAmount: paid,
    remaining,
    progress,
    nextDue: next?.dueDate ?? null,
    displayStatus,
    status: plan.status,
    installments: plan.installments.map((i) => ({
      id: i.id,
      sequence: i.sequence,
      dueDate: i.dueDate,
      amount: num(i.amount),
      paidAmount: num(i.paidAmount),
      status: i.status,
      paidAt: i.paidAt,
      isPaid: num(i.paidAmount) >= num(i.amount),
    })),
  };
}

export class CollectionsService {
  async commandCenter(organizationId: string) {
    await ensureCategories(organizationId);
    const today = startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [paymentsToday, dueInstallmentRows, overdueInstallments, pendingScholarships, receiptsToday, overdueStudents] =
      await Promise.all([
        prisma.payment.count({
          where: { organizationId, paidAt: { gte: today, lt: tomorrow }, status: 'COMPLETED' },
        }),
        prisma.installment.findMany({
          where: {
            plan: { organizationId, status: InstallmentStatus.ACTIVE },
            dueDate: { gte: today, lte: new Date(today.getTime() + 7 * 86_400_000) },
          },
          select: { id: true, amount: true, paidAmount: true },
        }),
        prisma.installment.count({
          where: {
            plan: { organizationId },
            dueDate: { lt: today },
            status: { in: [InstallmentStatus.ACTIVE, InstallmentStatus.OVERDUE] },
          },
        }),
        prisma.scholarship.count({ where: { organizationId, status: { in: ['PENDING', 'DRAFT', 'UNDER_REVIEW'] } } }),
        prisma.receipt.count({ where: { organizationId, issuedAt: { gte: today, lt: tomorrow } } }),
        prisma.studentBill.count({
          where: { organizationId, balance: { gt: 0 }, status: { not: BillStatus.CANCELLED } },
        }),
      ]);

    const installmentsDue = dueInstallmentRows.filter((i) => num(i.paidAmount) < num(i.amount)).length;

    return {
      paymentsToday,
      installmentsDueWeek: installmentsDue,
      overdueInstallments,
      pendingScholarships,
      receiptsToday,
      overdueStudents,
    };
  }

  async collectionsInsights(organizationId: string) {
    await ensureCategories(organizationId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const bills = await prisma.studentBill.findMany({
      where: { organizationId, status: { not: BillStatus.CANCELLED } },
    });
    const payments = await prisma.payment.findMany({
      where: { organizationId, paidAt: { gte: monthStart }, status: 'COMPLETED' },
    });

    const expected = bills.reduce((s, b) => s + num(b.netAmount), 0);
    const collected = payments.reduce((s, p) => s + num(p.amount), 0);
    const outstanding = bills.reduce((s, b) => s + num(b.balance), 0);

    const byMethod = payments.reduce<Record<string, number>>((acc, p) => {
      const k = String(p.method);
      acc[k] = (acc[k] ?? 0) + num(p.amount);
      return acc;
    }, {});

    const methodTotal = Object.values(byMethod).reduce((a, b) => a + b, 0) || 1;
    const paymentMethods = Object.entries(byMethod).map(([method, amount]) => ({
      method,
      amount,
      pct: Math.round((amount / methodTotal) * 100),
    }));

    const byClass = bills.reduce<Record<string, number>>((acc, b) => {
      const k = b.className || 'Unknown';
      acc[k] = (acc[k] ?? 0) + num(b.balance);
      return acc;
    }, {});
    const topOutstandingClasses = Object.entries(byClass)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([className, amount]) => ({ className, amount }));

    return {
      thisMonth: {
        expected,
        collected,
        outstanding,
        collectionRate: expected > 0 ? Math.round((collected / expected) * 1000) / 10 : 0,
      },
      paymentMethods,
      topOutstandingClasses,
    };
  }

  async installmentsOverview(organizationId: string, query: Record<string, string | undefined>) {
    await ensureCategories(organizationId);
    const plans = await prisma.installmentPlan.findMany({
      where: { organizationId },
      include: { installments: { orderBy: { sequence: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const weekEnd = new Date(now.getTime() + 7 * 86_400_000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    let allInstallments = plans.flatMap((p) => p.installments);
    const activePlans = plans.filter((p) => p.status === InstallmentStatus.ACTIVE).length;
    const dueThisWeek = allInstallments.filter(
      (i) => i.dueDate >= now && i.dueDate <= weekEnd && num(i.paidAmount) < num(i.amount)
    ).length;
    const overdue = allInstallments.filter(
      (i) => i.dueDate < now && num(i.paidAmount) < num(i.amount)
    ).length;

    const collectedThisMonth = allInstallments
      .filter((i) => i.paidAt && i.paidAt >= monthStart)
      .reduce((s, i) => s + num(i.paidAmount), 0);
    const expectedThisMonth = allInstallments
      .filter((i) => i.dueDate >= monthStart && i.dueDate <= monthEnd)
      .reduce((s, i) => s + num(i.amount), 0);

    let rows = plans.map(mapPlanRow);
    const search = query.search?.trim().toLowerCase();
    if (search) {
      rows = rows.filter(
        (r) =>
          r.studentName.toLowerCase().includes(search) ||
          r.studentId.toLowerCase().includes(search) ||
          r.className?.toLowerCase().includes(search)
      );
    }
    if (query.status?.trim() && query.status !== 'all') {
      const st = query.status.toLowerCase();
      rows = rows.filter((r) => r.displayStatus.toLowerCase().replace(/\s+/g, '_') === st.replace(/\s+/g, '_'));
    }
    if (query.className?.trim() && query.className !== 'all') {
      rows = rows.filter((r) => r.className === query.className);
    }
    if (query.frequency?.trim() && query.frequency !== 'all') {
      rows = rows.filter((r) => r.frequency === query.frequency);
    }

    return {
      summary: {
        activePlans,
        dueThisWeek,
        overdue,
        collectedThisMonth,
        expectedThisMonth,
        collectionRate:
          expectedThisMonth > 0 ? Math.round((collectedThisMonth / expectedThisMonth) * 1000) / 10 : 0,
      },
      plans: rows,
    };
  }

  async getInstallmentPlan(organizationId: string, id: string) {
    const plan = await prisma.installmentPlan.findFirst({
      where: { id, organizationId },
      include: { installments: { orderBy: { sequence: 'asc' } } },
    });
    if (!plan) throw new AppError(404, 'Payment plan not found');
    return mapPlanRow(plan);
  }

  async createInstallmentPlan(
    organizationId: string,
    body: {
      studentId: string;
      studentName: string;
      className?: string;
      billId?: string;
      planName?: string;
      frequency: string;
      totalAmount: number;
      installments: Array<{ dueDate: string; amount: number }>;
    }
  ) {
    await ensureCategories(organizationId);
    const items = body.installments ?? [];
    if (items.length === 0) throw new AppError(400, 'At least one installment is required');

    const sum = items.reduce((s, i) => s + Number(i.amount), 0);
    const total = Number(body.totalAmount);
    if (Math.abs(sum - total) > 0.01) {
      throw new AppError(400, `Installment amounts (${sum}) must equal total balance (${total})`);
    }

    const plan = await prisma.installmentPlan.create({
      data: {
        organizationId,
        studentId: body.studentId,
        studentName: body.studentName,
        className: body.className ?? null,
        billId: body.billId ?? null,
        planName: body.planName ?? `${body.frequency} payment plan`,
        frequency: body.frequency,
        totalAmount: total,
        paidAmount: 0,
        remaining: total,
        status: InstallmentStatus.ACTIVE,
        startDate: new Date(items[0].dueDate),
        endDate: new Date(items[items.length - 1].dueDate),
        installments: {
          create: items.map((item, idx) => ({
            sequence: idx + 1,
            dueDate: new Date(item.dueDate),
            amount: item.amount,
            paidAmount: 0,
            billId: body.billId ?? null,
            status: InstallmentStatus.ACTIVE,
          })),
        },
      },
      include: { installments: { orderBy: { sequence: 'asc' } } },
    });

    return mapPlanRow(plan);
  }

  async outstandingOverview(organizationId: string, query: Record<string, string | undefined>) {
    await ensureCategories(organizationId);
    const now = new Date();

    const bills = await prisma.studentBill.findMany({
      where: {
        organizationId,
        balance: { gt: 0 },
        status: { not: BillStatus.CANCELLED },
      },
      include: { lineItems: true },
      orderBy: { balance: 'desc' },
    });

    const plans = await prisma.installmentPlan.findMany({
      where: { organizationId, status: InstallmentStatus.ACTIVE },
      include: { installments: true },
    });

    const missedByStudent = new Map<string, number>();
    for (const plan of plans) {
      const missed = plan.installments.filter(
        (i) => i.dueDate < now && num(i.paidAmount) < num(i.amount)
      ).length;
      if (missed > 0) missedByStudent.set(plan.studentId, (missedByStudent.get(plan.studentId) ?? 0) + missed);
    }

    let dueSoon = 0;
    let critical = 0;

    const rows = (
      await Promise.all(
        bills.map(async (b) => {
          const sm =
            (await studentManagementClient.lookupStudentByCode(organizationId, b.studentCode)) ??
            (await studentManagementClient.lookupStudentByCode(organizationId, b.studentId));
          if (!sm) return null;

          const balance = num(b.balance);
          const dueDate = b.dueDate;
          const daysOverdue = dueDate && dueDate < now ? daysBetween(dueDate, now) : 0;

          const risk = computeRisk({
            balance,
            dueDate,
            daysOverdue,
            missedInstallments: missedByStudent.get(b.studentId) ?? missedByStudent.get(sm.id),
          });

          if (dueDate) {
            const daysUntil = daysBetween(now, dueDate);
            if (daysUntil >= 0 && daysUntil <= 7) dueSoon += balance;
          }
          if (risk === 'CRITICAL') critical += balance;

          return {
            id: b.id,
            billNumber: b.billNumber,
            studentId: sm.id,
            studentCode: sm.studentCode,
            studentName: sm.fullName,
            className: sm.className ?? b.className,
            academicYear: b.academicYear,
            term: b.term,
            netAmount: num(b.netAmount),
            paidAmount: num(b.paidAmount),
            balance,
            dueDate: b.dueDate,
            daysOverdue,
            risk,
            lineItems: b.lineItems.map((li) => ({
              id: li.id,
              category: li.category,
              description: li.description,
              amount: num(li.amount),
            })),
          };
        })
      )
    ).filter((r): r is NonNullable<typeof r> => r != null);

    let filtered = rows;
    const search = query.search?.trim().toLowerCase();
    if (search) {
      filtered = filtered.filter(
        (r) =>
          r.studentName.toLowerCase().includes(search) ||
          r.studentCode.toLowerCase().includes(search) ||
          r.studentId.toLowerCase().includes(search)
      );
    }
    if (query.risk?.trim() && query.risk !== 'all') {
      filtered = filtered.filter((r) => r.risk === query.risk?.toUpperCase());
    }
    if (query.className?.trim() && query.className !== 'all') {
      filtered = filtered.filter((r) => r.className === query.className);
    }

    const totalOutstanding = rows.reduce((s, r) => s + r.balance, 0);
    const overdueAmount = rows.filter((r) => r.daysOverdue > 0).reduce((s, r) => s + r.balance, 0);
    const totalNet = rows.reduce((s, r) => s + r.netAmount, 0);
    const totalPaid = rows.reduce((s, r) => s + r.paidAmount, 0);

    return {
      summary: {
        totalOutstanding,
        studentsWithBalance: new Set(rows.map((r) => r.studentId)).size,
        overdueAmount,
        dueSoonAmount: dueSoon,
        criticalAmount: critical,
        collectionRate: totalNet > 0 ? Math.round((totalPaid / totalNet) * 1000) / 10 : 0,
      },
      bills: filtered,
    };
  }

  async scholarshipsOverview(organizationId: string) {
    await ensureCategories(organizationId);
    const rows = await prisma.scholarship.findMany({
      where: { organizationId },
      include: { sponsor: true },
      orderBy: { createdAt: 'desc' },
    });

    const mapped = rows.map((r) => ({
      ...r,
      amount: num(r.amount),
      allocated: num(r.allocated),
      remaining: num(r.remaining),
    }));

    const active = mapped.filter((r) => r.status === 'ACTIVE').length;
    const students = new Set(mapped.map((r) => r.studentId)).size;
    const totalAwarded = mapped.reduce((s, r) => s + r.allocated, 0);
    const pending = mapped.filter((r) => ['PENDING', 'DRAFT', 'UNDER_REVIEW'].includes(r.status)).length;

    const types = [...new Set(mapped.map((r) => String(r.type)))];

    return {
      summary: {
        activeScholarships: active,
        studentsSupported: students,
        totalAwarded,
        pendingApproval: pending,
      },
      types,
      scholarships: mapped,
    };
  }

  async receiptsOverview(organizationId: string, query: Record<string, string | undefined>) {
    await ensureCategories(organizationId);
    const today = startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const page = Math.max(1, parseInt(query.page ?? '1', 10));
    const pageSize = Math.min(100, Math.max(5, parseInt(query.pageSize ?? '10', 10)));

    const where: Prisma.ReceiptWhereInput = { organizationId };
    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { receiptNumber: { contains: s, mode: 'insensitive' } },
        { studentName: { contains: s, mode: 'insensitive' } },
        { studentCode: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (query.method?.trim() && query.method !== 'all') {
      where.method = query.method;
    }

    const [total, rows, todayCount, todayAmount, digitalCount] = await Promise.all([
      prisma.receipt.count({ where }),
      prisma.receipt.findMany({
        where,
        include: { payment: true },
        orderBy: { issuedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.receipt.count({ where: { organizationId, issuedAt: { gte: today, lt: tomorrow } } }),
      prisma.receipt.aggregate({
        where: { organizationId, issuedAt: { gte: today, lt: tomorrow } },
        _sum: { amountPaid: true },
      }),
      prisma.receipt.count({ where: { organizationId, qrCode: { not: null } } }),
    ]);

    return {
      summary: {
        receiptsToday: todayCount,
        amountCollectedToday: num(todayAmount._sum.amountPaid),
        digitalReceipts: digitalCount,
        printed: Math.max(0, todayCount - Math.floor(digitalCount * 0.1)),
        cancelled: await prisma.payment.count({
          where: { organizationId, status: 'REVERSED' },
        }),
      },
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      data: rows.map((r) => ({
        id: r.id,
        receiptNumber: r.receiptNumber,
        studentName: r.studentName,
        studentCode: r.studentCode,
        className: r.className,
        amountPaid: num(r.amountPaid),
        outstanding: num(r.outstanding),
        method: r.method,
        qrCode: r.qrCode,
        issuedAt: r.issuedAt,
        paymentStatus: r.payment?.status ?? 'COMPLETED',
        reference: r.payment?.reference ?? null,
      })),
    };
  }

  async getReceipt(organizationId: string, id: string) {
    const receipt = await prisma.receipt.findFirst({
      where: { id, organizationId },
      include: {
        payment: {
          include: {
            bill: { include: { lineItems: true } },
          },
        },
      },
    });
    if (!receipt) throw new AppError(404, 'Receipt not found');

    return {
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      studentName: receipt.studentName,
      studentCode: receipt.studentCode,
      className: receipt.className,
      amountPaid: num(receipt.amountPaid),
      outstanding: num(receipt.outstanding),
      method: receipt.method,
      qrCode: receipt.qrCode,
      issuedAt: receipt.issuedAt,
      payment: receipt.payment
        ? {
            id: receipt.payment.id,
            paymentNumber: receipt.payment.paymentNumber,
            reference: receipt.payment.reference,
            status: receipt.payment.status,
            paidAt: receipt.payment.paidAt,
            reversedAt: receipt.payment.reversedAt,
            notes: receipt.payment.notes,
          }
        : null,
      lineItems: receipt.payment?.bill?.lineItems?.map((li) => ({
        description: li.description,
        amount: num(li.amount),
      })) ?? [],
    };
  }

  async verifyReceipt(organizationId: string, receiptNumber: string) {
    const receipt = await prisma.receipt.findFirst({
      where: { organizationId, receiptNumber },
      include: { payment: true },
    });
    if (!receipt) return { valid: false as const, message: 'Receipt not found' };
    if (receipt.payment?.status === 'REVERSED') {
      return {
        valid: false as const,
        message: 'Receipt has been voided',
        receipt: {
          receiptNumber: receipt.receiptNumber,
          status: 'VOIDED',
        },
      };
    }
    return {
      valid: true as const,
      message: 'Authentic receipt',
      receipt: {
        receiptNumber: receipt.receiptNumber,
        studentName: receipt.studentName,
        amount: num(receipt.amountPaid),
        paidAt: receipt.issuedAt,
        status: 'Valid',
      },
    };
  }

  async getPublicReceipt(receiptNumber: string) {
    const receipt = await prisma.receipt.findFirst({
      where: { receiptNumber },
      include: {
        payment: {
          include: {
            bill: { include: { lineItems: true } },
          },
        },
      },
    });
    if (!receipt) throw new AppError(404, 'Receipt not found');

    const branding = await this.organizationBranding(receipt.organizationId);
    const voided = receipt.payment?.status === 'REVERSED';
    const verifyUrl = receiptPublicUrl(receipt.receiptNumber);

    return {
      receiptNumber: receipt.receiptNumber,
      studentName: receipt.studentName,
      studentCode: receipt.studentCode,
      className: receipt.className,
      amountPaid: num(receipt.amountPaid),
      outstanding: num(receipt.outstanding),
      method: receipt.method,
      issuedAt: receipt.issuedAt,
      reference: receipt.payment?.reference ?? null,
      lineItems:
        receipt.payment?.bill?.lineItems?.map((li) => ({
          description: li.description,
          amount: num(li.amount),
        })) ?? [],
      qrCode: receipt.qrCode || verifyUrl,
      verifyUrl,
      voided,
      verifyValid: !voided,
      verifyMessage: voided ? 'This receipt has been voided' : 'Authentic Shule+ receipt',
      accountStatus: num(receipt.outstanding) <= 0 ? 'PAID' : 'PARTIAL',
      paymentStatus: voided ? 'REVERSED' : 'COMPLETED',
      branding,
    };
  }

  async studentFinancialProfile(
    organizationId: string,
    studentId: string,
    opts?: { studentCode?: string }
  ) {
    await ensureCategories(organizationId);

    const sm =
      (opts?.studentCode
        ? await studentManagementClient.lookupStudentByCode(organizationId, opts.studentCode)
        : null) ??
      (await studentManagementClient.lookupStudentByCode(organizationId, studentId)) ??
      (await studentManagementClient.searchStudents(organizationId, { search: studentId, status: 'ALL' })).find(
        (s) => s.id === studentId || s.studentCode === studentId
      ) ??
      null;

    const identityKeys = [
      ...new Set([studentId, opts?.studentCode, sm?.id, sm?.studentCode].filter(Boolean)),
    ] as string[];

    const billIdentityOr = identityKeys.flatMap((k) => [{ studentId: k }, { studentCode: k }]);
    const paymentIdentityOr = [
      ...identityKeys.map((k) => ({ studentId: k })),
      { bill: { OR: billIdentityOr } },
    ];
    const receiptIdentityOr = [
      ...identityKeys.map((k) => ({ studentCode: k })),
      { payment: { OR: paymentIdentityOr } },
    ];

    const [bills, payments, receipts, scholarships, plans] = await Promise.all([
      prisma.studentBill.findMany({
        where: {
          organizationId,
          OR: billIdentityOr,
        },
        include: { lineItems: true, structure: true },
        orderBy: { billedAt: 'desc' },
      }),
      prisma.payment.findMany({
        where: {
          organizationId,
          OR: paymentIdentityOr,
        },
        include: { receipt: true },
        orderBy: { paidAt: 'desc' },
        take: 20,
      }),
      prisma.receipt.findMany({
        where: {
          organizationId,
          OR: receiptIdentityOr,
        },
        orderBy: { issuedAt: 'desc' },
        take: 20,
      }),
      prisma.scholarship.findMany({
        where: {
          organizationId,
          OR: identityKeys.flatMap((k) => [{ studentId: k }]),
        },
      }),
      prisma.installmentPlan.findMany({
        where: {
          organizationId,
          OR: identityKeys.flatMap((k) => [{ studentId: k }]),
        },
        include: { installments: { orderBy: { sequence: 'asc' } } },
      }),
    ]);

    const totalFees = bills.reduce((s, b) => s + num(b.grossAmount), 0);
    const scholarshipTotal = bills.reduce((s, b) => s + num(b.scholarshipAmount), 0);
    const adjustedFees = bills.reduce((s, b) => s + num(b.netAmount), 0);
    const paid = bills.reduce((s, b) => s + num(b.paidAmount), 0);
    const outstanding = bills.reduce((s, b) => s + num(b.balance), 0);

    const profile = bills[0];

    return {
      studentId: sm?.id ?? studentId,
      studentCode: sm?.studentCode ?? profile?.studentCode ?? studentId,
      studentName: sm?.fullName ?? profile?.studentName ?? plans[0]?.studentName ?? studentId,
      className: sm?.className ?? profile?.className ?? plans[0]?.className ?? null,
      overview: {
        totalFees,
        scholarship: scholarshipTotal,
        adjustedFees,
        paid,
        outstanding,
      },
      bills: bills.map((b) => {
        const paidRatio = num(b.netAmount) > 0 ? num(b.paidAmount) / num(b.netAmount) : 0;
        return {
          id: b.id,
          billNumber: b.billNumber,
          academicYear: b.academicYear,
          term: b.term,
          netAmount: num(b.netAmount),
          paidAmount: num(b.paidAmount),
          balance: num(b.balance),
          status: b.status,
          lineItems: b.lineItems.map((li) => {
            const amount = num(li.amount);
            const paid = Math.round(amount * paidRatio);
            return {
              description: li.description,
              amount: Math.max(0, amount - paid),
            };
          }),
        };
      }),
      payments: payments.map((p) => ({
        id: p.id,
        paymentNumber: p.paymentNumber,
        amount: num(p.amount),
        method: p.method,
        paidAt: p.paidAt,
        status: p.status,
        receiptId: p.receipt?.id ?? null,
        receiptNumber: p.receipt?.receiptNumber ?? null,
      })),
      receipts: receipts.map((r) => ({
        id: r.id,
        receiptNumber: r.receiptNumber,
        amountPaid: num(r.amountPaid),
        issuedAt: r.issuedAt,
      })),
      scholarships,
      installmentPlans: plans.map(mapPlanRow),
    };
  }

  async voidReceipt(
    organizationId: string,
    receiptId: string,
    body: { reason: string; voidedBy?: string }
  ) {
    const receipt = await prisma.receipt.findFirst({
      where: { id: receiptId, organizationId },
      include: { payment: { include: { bill: true } } },
    });
    if (!receipt?.payment) throw new AppError(404, 'Receipt not found');
    if (receipt.payment.status === PaymentStatus.REVERSED) {
      throw new AppError(400, 'Receipt already voided');
    }

    const amount = num(receipt.payment.amount);

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: receipt.payment!.id },
        data: {
          status: PaymentStatus.REVERSED,
          reversedAt: new Date(),
          notes: body.reason,
        },
      });

      if (receipt.payment!.billId && receipt.payment!.bill) {
        const bill = receipt.payment!.bill;
        const paid = Math.max(num(bill.paidAmount) - amount, 0);
        const balance = Math.max(num(bill.netAmount) - paid, 0);
        await tx.studentBill.update({
          where: { id: bill.id },
          data: {
            paidAmount: paid,
            balance,
            status: balance <= 0 ? BillStatus.PAID : balance >= num(bill.netAmount) ? BillStatus.PENDING : BillStatus.PARTIALLY_PAID,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          organizationId,
          actorEmail: body.voidedBy ?? null,
          action: 'RECEIPT_VOIDED',
          entityType: 'RECEIPT',
          entityId: receipt.id,
          details: { receiptNumber: receipt.receiptNumber, reason: body.reason, amount },
        },
      });
    });

    void parentMisClient.ingestFeeEvent({
      organizationId,
      studentCode: receipt.studentCode ?? receipt.payment.studentId,
      studentName: receipt.studentName,
      title: 'Receipt voided',
      body: `Receipt ${receipt.receiptNumber} was voided. Reason: ${body.reason}`,
      eventType: 'RECEIPT_REVERSED',
      priority: 'IMPORTANT',
      link: '/fees',
    });

    return this.getReceipt(organizationId, receiptId);
  }

  async organizationBranding(organizationId: string) {
    const [tenant, iam] = await Promise.all([
      prisma.tenant.findFirst({
        where: { OR: [{ organizationId }, { organizationCode: organizationId }] },
      }),
      fetchIamOrganizationProfile(organizationId),
    ]);
    return {
      schoolName: iam?.schoolName ?? tenant?.organizationName ?? 'School',
      organizationCode: iam?.organizationCode ?? tenant?.organizationCode ?? null,
      email: iam?.email ?? null,
      phone: iam?.phone ?? null,
      address: iam?.address ?? null,
      district: iam?.district ?? null,
      logoUrl: resolveIamAssetUrl(iam?.logoUrl ?? null),
      stampUrl: resolveIamAssetUrl(iam?.stampUrl ?? null),
      signatureUrl: resolveIamAssetUrl(iam?.signatureUrl ?? null),
    };
  }

  async receiptHtml(
    organizationId: string,
    receipt: {
      receiptNumber: string;
      studentName: string;
      studentCode: string | null;
      className: string | null;
      amountPaid: number;
      outstanding: number;
      method: string;
      issuedAt: Date | string;
      lineItems: Array<{ description: string; amount: number }>;
      payment?: { reference: string | null } | null;
      qrCode?: string | null;
      academicYear?: string | null;
      term?: string | null;
    }
  ) {
    const org = await this.organizationBranding(organizationId);
    const verifyUrl = receiptPublicUrl(receipt.receiptNumber);

    const lines = receipt.lineItems.length
      ? receipt.lineItems
          .map(
            (li) =>
              `<tr><td style="padding:10px 0;border-bottom:1px solid #eef2f7;color:#334155">${li.description}</td><td style="padding:10px 0;border-bottom:1px solid #eef2f7;text-align:right;font-weight:700;color:#000435">${li.amount.toLocaleString()} RWF</td></tr>`
          )
          .join('')
      : `<tr><td style="padding:10px 0;color:#334155">School fees</td><td style="padding:10px 0;text-align:right;font-weight:700">${receipt.amountPaid.toLocaleString()} RWF</td></tr>`;

    const logoBlock = org.logoUrl
      ? `<img src="${org.logoUrl}" alt="School logo" style="height:64px;width:64px;object-fit:contain;border-radius:12px;background:#fff;padding:6px;box-shadow:0 2px 8px rgba(0,4,53,.08)" />`
      : `<div style="height:64px;width:64px;border-radius:12px;background:#000435;color:#FCB038;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px">S+</div>`;

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt ${receipt.receiptNumber}</title>
<style>
  @media print { body { margin: 0; } .no-print { display: none !important; } }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; color: #000435; }
</style></head>
<body>
  <div style="max-width:520px;margin:24px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(0,4,53,.12)">
    <div style="background:linear-gradient(135deg,#000435 0%,#001a5c 100%);padding:28px 24px;color:#fff">
      <div style="display:flex;align-items:center;gap:16px">
        ${logoBlock}
        <div>
          <h1 style="margin:0;font-size:18px;font-weight:800;letter-spacing:.02em">${org.schoolName}</h1>
          <p style="margin:4px 0 0;font-size:11px;opacity:.85">${[org.address, org.district].filter(Boolean).join(' · ') || 'School Fees Office'}</p>
          <p style="margin:2px 0 0;font-size:11px;opacity:.75">${[org.phone, org.email].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
    </div>
    <div style="padding:24px">
      <div style="text-align:center;margin-bottom:20px">
        <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:.14em;color:#FCB038">PAYMENT RECEIPT</p>
        <p style="margin:6px 0 0;font-size:22px;font-weight:800;color:#000435">${receipt.receiptNumber}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#64748b">${new Date(receipt.issuedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
      <div style="background:#f8fafc;border-radius:14px;padding:16px;margin-bottom:18px">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.08em">Student</p>
        <p style="margin:0;font-size:16px;font-weight:800">${receipt.studentName}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#64748b">Code: ${receipt.studentCode ?? '—'} · Class: ${receipt.className ?? '—'}</p>
        ${receipt.academicYear ? `<p style="margin:4px 0 0;font-size:13px;color:#64748b">${receipt.academicYear} · ${receipt.term ?? ''}</p>` : ''}
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">${lines}</table>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-top:2px solid #000435;border-bottom:2px solid #000435;margin-bottom:16px">
        <span style="font-weight:800;font-size:15px">TOTAL PAID</span>
        <span style="font-weight:800;font-size:20px;color:#000435">${receipt.amountPaid.toLocaleString()} RWF</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;margin-bottom:20px">
        <div><span style="color:#64748b">Previous balance</span><br/><strong>${(receipt.amountPaid + receipt.outstanding).toLocaleString()} RWF</strong></div>
        <div style="text-align:right"><span style="color:#64748b">Remaining</span><br/><strong style="color:#b45309">${receipt.outstanding.toLocaleString()} RWF</strong></div>
      </div>
      <div style="font-size:13px;color:#64748b;line-height:1.6">
        <strong style="color:#000435">Payment:</strong> ${receipt.method.replace(/_/g, ' ')}<br/>
        <strong style="color:#000435">Reference:</strong> ${receipt.payment?.reference ?? '—'}
      </div>
      ${verifyUrl ? `<div style="margin-top:20px;text-align:center;padding-top:16px;border-top:1px dashed #cbd5e1">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verifyUrl)}" width="96" height="96" alt="Verify QR" style="border-radius:8px" />
        <p style="margin:8px 0 0;font-size:10px;color:#94a3b8;font-weight:600">Scan to verify receipt authenticity</p>
      </div>` : ''}
      ${org.stampUrl ? `<div style="margin-top:16px;text-align:right"><img src="${org.stampUrl}" alt="Stamp" style="height:48px;opacity:.85" /></div>` : ''}
    </div>
    <div style="background:#000435;color:#94a3b8;text-align:center;padding:12px;font-size:10px">Generated by Shule+ School Fees · ${new Date().toISOString()}</div>
  </div>
  <p class="no-print" style="text-align:center;margin-top:16px"><button onclick="window.print()" style="background:#FCB038;border:none;padding:12px 24px;border-radius:10px;font-weight:700;cursor:pointer;color:#000435">Print Receipt</button></p>
</body></html>`;
  }

  async getReceiptPdfHtml(organizationId: string, id: string) {
    const receipt = await this.getReceipt(organizationId, id);
    return this.receiptHtml(organizationId, {
      ...receipt,
      lineItems: receipt.lineItems,
      payment: receipt.payment,
      qrCode: receipt.qrCode,
    });
  }

  async sendReceiptToParent(organizationId: string, id: string) {
    const receipt = await this.getReceipt(organizationId, id);
    if (receipt.payment?.status === 'REVERSED') throw new AppError(400, 'Cannot send voided receipt');

    const studentId = receipt.studentCode ?? '';
    const parents = studentId ? await studentManagementClient.parentsForStudent(organizationId, studentId) : [];
    if (!parents.length) throw new AppError(404, 'No parent contacts found for this student');

    const html = await this.receiptHtml(organizationId, {
      receiptNumber: receipt.receiptNumber,
      studentName: receipt.studentName,
      studentCode: receipt.studentCode,
      className: receipt.className,
      amountPaid: receipt.amountPaid,
      outstanding: receipt.outstanding,
      method: receipt.method,
      issuedAt: receipt.issuedAt,
      lineItems: receipt.lineItems,
      payment: receipt.payment,
      qrCode: receipt.qrCode,
    });

    const results: Array<{ parentId: string; channel: string; ok: boolean }> = [];

    for (const parent of parents) {
      if (parent.email) {
        const res = await notificationClient.sendEmail({
          to: parent.email,
          subject: `Payment Receipt ${receipt.receiptNumber} — ${receipt.studentName}`,
          html,
          templateSlug: 'fee-receipt',
          templateVariables: {
            student_name: receipt.studentName,
            receipt_number: receipt.receiptNumber,
            amount: String(receipt.amountPaid),
          },
        });
        results.push({ parentId: parent.id, channel: 'EMAIL', ok: Boolean(res) });
      }

      if (parent.phone && parent.smsEnabled) {
        const res = await notificationClient.sendSms({
          to: parent.phone,
          body: `Receipt ${receipt.receiptNumber}: ${receipt.studentName} paid ${receipt.amountPaid.toLocaleString()} RWF. Balance: ${receipt.outstanding.toLocaleString()} RWF.`,
        });
        results.push({ parentId: parent.id, channel: 'SMS', ok: Boolean(res) });
      }

      void parentMisClient.ingestFeeEvent({
        organizationId,
        studentCode: studentId,
        studentName: receipt.studentName,
        title: 'Payment receipt',
        body: `Receipt ${receipt.receiptNumber} for ${receipt.amountPaid.toLocaleString()} RWF is available.`,
        eventType: 'RECEIPT_GENERATED',
        priority: 'NORMAL',
        link: '/fees',
      });

      void notificationClient.sendInApp({
        userId: parent.id,
        title: 'Payment receipt ready',
        body: `${receipt.studentName} — ${receipt.amountPaid.toLocaleString()} RWF received.`,
        actionUrl: '/fees',
      });
    }

    return { sent: results.filter((r) => r.ok).length, attempts: results.length, results };
  }
}

export const collectionsService = new CollectionsService();
