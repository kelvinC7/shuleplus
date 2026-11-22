import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import type {
  SmsCreditAllocation,
  SmsParentPackageKind,
  SmsParentPaymentStatus,
  SmsParentPurchaseStatus,
} from '../../generated/prisma';

function maskPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.length < 4) return '****';
  return `${d.slice(0, 3)}***${d.slice(-3)}`;
}

function normalizePhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('250')) return d;
  if (d.startsWith('0')) return `250${d.slice(1)}`;
  return d;
}

async function nextPurchaseRef(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SMS-${year}-`;
  const last = await prisma.smsParentPurchase.findFirst({
    where: { purchaseRef: { startsWith: prefix } },
    orderBy: { purchaseRef: 'desc' },
    select: { purchaseRef: true },
  });
  let seq = 1;
  if (last?.purchaseRef) {
    const part = last.purchaseRef.slice(prefix.length);
    const n = parseInt(part, 10);
    if (Number.isFinite(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(5, '0')}`;
}

export async function ensureDefaultPackages(organizationId: string) {
  const settings = await prisma.smsSchoolSettings.findUnique({ where: { organizationId } });
  if (!settings) return [];
  const count = await prisma.smsParentPackage.count({ where: { organizationId } });
  if (count > 0) {
    return prisma.smsParentPackage.findMany({
      where: { organizationId, active: true },
      orderBy: [{ sortOrder: 'asc' }, { kind: 'asc' }],
    });
  }
  await prisma.smsParentPackage.createMany({
    data: [
      {
        organizationId,
        kind: 'TERM',
        title: 'Term Package',
        priceRwf: 5000,
        segmentAllowance: 250,
        validityDays: 120,
        description: 'SMS credits for one academic term',
        sortOrder: 1,
      },
      {
        organizationId,
        kind: 'ACADEMIC_YEAR',
        title: 'Academic Year',
        priceRwf: 15000,
        segmentAllowance: 1000,
        validityDays: 365,
        description: 'Full-year SMS allowance',
        sortOrder: 2,
      },
    ],
  });
  return prisma.smsParentPackage.findMany({
    where: { organizationId, active: true },
    orderBy: [{ sortOrder: 'asc' }, { kind: 'asc' }],
  });
}

export async function getParentPortalConfig(organizationId: string) {
  const settings = await prisma.smsSchoolSettings.findUnique({ where: { organizationId } });
  const packages = settings?.parentPackagesEnabled
    ? await ensureDefaultPackages(organizationId)
    : [];
  return {
    enabled: Boolean(settings?.parentPackagesEnabled && settings?.smsEnabled),
    momoPayeeNumber: settings?.momoPayeeNumber ?? null,
    momoUssdTemplate:
      settings?.momoUssdTemplate ??
      (settings?.momoPayeeNumber ? `*182*1*${settings.momoPayeeNumber}#` : null),
    defaultAllocation: settings?.defaultAllocation ?? 'CHILD',
    packages,
  };
}

export async function getParentUsageSummary(parentId: string, phones: string[]) {
  const normalized = [...new Set(phones.map(normalizePhone).filter(Boolean))];
  const purchases = await prisma.smsParentPurchase.findMany({
    where: { parentId },
    include: { payment: true, lines: true },
    orderBy: { createdAt: 'desc' },
  });

  const balances = await prisma.smsParentCreditBalance.findMany({
    where: { parentId },
  });

  const totalPurchased = balances.reduce((s, b) => s + b.segmentsGranted, 0);
  const totalRemaining = balances.reduce((s, b) => s + b.segmentsRemaining, 0);
  const totalUsed = balances.reduce((s, b) => s + b.segmentsUsed, 0);
  const pendingPurchases = purchases.filter(
    (p) => p.status === 'PENDING_PAYMENT' || p.status === 'PENDING_APPROVAL'
  ).length;

  const recipients = normalized.length
    ? await prisma.smsRecipient.findMany({
        where: { phoneNormalized: { in: normalized } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      })
    : [];

  return {
    totalPurchased,
    totalRemaining,
    totalUsed,
    pendingPurchases,
    balances: balances.map((b) => ({
      id: b.id,
      studentId: b.studentId,
      segmentsGranted: b.segmentsGranted,
      segmentsUsed: b.segmentsUsed,
      segmentsRemaining: b.segmentsRemaining,
      expiresAt: b.expiresAt?.toISOString() ?? null,
      purchaseId: b.purchaseId,
    })),
    purchases: purchases.map(mapPurchase),
    messageCount: recipients.length,
  };
}

function mapPurchase(p: {
  id: string;
  purchaseRef: string;
  status: SmsParentPurchaseStatus;
  totalAmountRwf: number;
  totalSegments: number;
  payerPhone: string;
  creditsActivated: boolean;
  activatedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  allocation: SmsCreditAllocation;
  lines: Array<{
    studentName: string;
    studentCode: string | null;
    className: string | null;
    segmentAllowance: number;
    amountRwf: number;
    schoolName: string | null;
  }>;
  payment: {
    status: SmsParentPaymentStatus;
    momoReference: string | null;
    submittedAt: Date | null;
    verifiedAt: Date | null;
    rejectionReason: string | null;
  } | null;
}) {
  const pkgKind = p.lines[0] ? undefined : undefined;
  return {
    id: p.id,
    purchaseRef: p.purchaseRef,
    status: p.status,
    paymentStatus: p.payment?.status ?? 'AWAITING',
    totalAmountRwf: p.totalAmountRwf,
    totalSegments: p.totalSegments,
    payerPhone: maskPhone(p.payerPhone),
    creditsActivated: p.creditsActivated,
    activatedAt: p.activatedAt?.toISOString() ?? null,
    rejectionReason: p.rejectionReason ?? p.payment?.rejectionReason ?? null,
    createdAt: p.createdAt.toISOString(),
    allocation: p.allocation,
    packageLabel: pkgKind,
    lines: p.lines,
  };
}

export async function listParentPurchases(parentId: string, status?: string) {
  const where: { parentId: string; status?: SmsParentPurchaseStatus } = { parentId };
  if (status && status !== 'ALL') {
    where.status = status as SmsParentPurchaseStatus;
  }
  const rows = await prisma.smsParentPurchase.findMany({
    where,
    include: { payment: true, lines: { include: { package: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((p) => ({
    ...mapPurchase(p),
    packageKind: p.lines[0]?.package?.kind ?? null,
    packageTitle: p.lines[0]?.package?.title ?? 'SMS Package',
  }));
}

export async function listParentMessages(phones: string[], status?: string) {
  const normalized = [...new Set(phones.map(normalizePhone).filter(Boolean))];
  if (!normalized.length) return [];
  const rows = await prisma.smsRecipient.findMany({
    where: {
      phoneNormalized: { in: normalized },
      ...(status && status !== 'ALL' ? { status: status as 'DELIVERED' | 'FAILED' | 'QUEUED' | 'SENT' | 'SKIPPED' } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return rows.map((m) => ({
    id: m.id,
    status: m.status,
    messageBody: m.messageBody,
    segments: m.segments,
    phoneMasked: m.phoneMasked,
    studentSummary: m.studentSummary,
    failureReason: m.failureReason,
    createdAt: m.createdAt.toISOString(),
    deliveredAt: m.deliveredAt?.toISOString() ?? null,
    organizationId: m.organizationId,
  }));
}

type LineInput = {
  studentId: string;
  studentName: string;
  studentCode?: string;
  className?: string;
  schoolName?: string;
  organizationId: string;
  packageId: string;
};

export async function createParentPurchase(input: {
  parentId: string;
  parentPhone: string;
  payerPhone: string;
  allocation: SmsCreditAllocation;
  lines: LineInput[];
}) {
  if (!input.lines.length) throw new AppError(400, 'Select at least one child and package');

  const orgIds = [...new Set(input.lines.map((l) => l.organizationId))];
  if (orgIds.length !== 1) {
    throw new AppError(400, 'Purchase one school at a time. Split children by school.');
  }
  const organizationId = orgIds[0]!;
  const settings = await prisma.smsSchoolSettings.findUnique({ where: { organizationId } });
  if (!settings?.parentPackagesEnabled || !settings.smsEnabled) {
    throw new AppError(403, 'SMS packages are not enabled for this school');
  }

  const packageIds = [...new Set(input.lines.map((l) => l.packageId))];
  const packages = await prisma.smsParentPackage.findMany({
    where: { id: { in: packageIds }, organizationId, active: true },
  });
  if (packages.length !== packageIds.length) throw new AppError(400, 'Invalid package selection');
  const pkgMap = new Map(packages.map((p) => [p.id, p]));

  let totalAmountRwf = 0;
  let totalSegments = 0;
  const lineData = input.lines.map((l) => {
    const pkg = pkgMap.get(l.packageId)!;
    totalAmountRwf += pkg.priceRwf;
    totalSegments += pkg.segmentAllowance;
    return {
      packageId: pkg.id,
      studentId: l.studentId,
      studentName: l.studentName,
      studentCode: l.studentCode ?? null,
      className: l.className ?? null,
      organizationId: l.organizationId,
      schoolName: l.schoolName ?? null,
      amountRwf: pkg.priceRwf,
      segmentAllowance: pkg.segmentAllowance,
    };
  });

  const purchaseRef = await nextPurchaseRef();
  const purchase = await prisma.$transaction(async (tx) => {
    const p = await tx.smsParentPurchase.create({
      data: {
        purchaseRef,
        organizationId,
        parentId: input.parentId,
        parentPhone: normalizePhone(input.parentPhone),
        payerPhone: normalizePhone(input.payerPhone),
        status: 'PENDING_PAYMENT',
        totalAmountRwf,
        totalSegments,
        allocation: input.allocation,
        lines: { create: lineData },
        payment: { create: { status: 'AWAITING' } },
      },
      include: { payment: true, lines: { include: { package: true } } },
    });
    return p;
  });

  const config = await getParentPortalConfig(organizationId);
  return {
    purchase: {
      ...mapPurchase(purchase),
      packageTitle: purchase.lines[0]?.package?.title ?? 'SMS Package',
    },
    payment: {
      amountRwf: totalAmountRwf,
      momoPayeeNumber: config.momoPayeeNumber,
      ussdTemplate: config.momoUssdTemplate,
    },
  };
}

export async function submitParentPayment(input: {
  parentId: string;
  purchaseId: string;
  momoReference: string;
}) {
  const purchase = await prisma.smsParentPurchase.findFirst({
    where: { id: input.purchaseId, parentId: input.parentId },
    include: { payment: true, lines: { include: { package: true } } },
  });
  if (!purchase) throw new AppError(404, 'Purchase not found');
  if (purchase.status !== 'PENDING_PAYMENT' && purchase.status !== 'PENDING_APPROVAL') {
    throw new AppError(400, 'This purchase cannot accept payment submission');
  }
  const ref = input.momoReference.trim();
  if (ref.length < 4) throw new AppError(400, 'Enter your Mobile Money transaction reference');

  const dup = await prisma.smsParentPaymentTransaction.findFirst({
    where: { momoReference: ref, NOT: { purchaseId: purchase.id } },
  });
  if (dup) throw new AppError(409, 'This transaction reference was already used');

  const updated = await prisma.$transaction(async (tx) => {
    await tx.smsParentPaymentTransaction.update({
      where: { purchaseId: purchase.id },
      data: {
        status: 'SUBMITTED',
        momoReference: ref,
        submittedAt: new Date(),
      },
    });
    return tx.smsParentPurchase.update({
      where: { id: purchase.id },
      data: { status: 'PENDING_APPROVAL' },
      include: { payment: true, lines: { include: { package: true } } },
    });
  });

  return mapPurchase(updated);
}

export async function activatePurchaseOnce(purchaseId: string, verifiedBy: string) {
  return prisma.$transaction(async (tx) => {
    const purchase = await tx.smsParentPurchase.findUnique({
      where: { id: purchaseId },
      include: { lines: { include: { package: true } }, payment: true },
    });
    if (!purchase) throw new AppError(404, 'Purchase not found');
    if (purchase.creditsActivated) return purchase;
    if (purchase.status !== 'PENDING_APPROVAL' && purchase.status !== 'PAYMENT_VERIFIED') {
      throw new AppError(400, 'Purchase is not ready for activation');
    }

    const now = new Date();
    for (const line of purchase.lines) {
      const validityDays = line.package?.validityDays ?? 365;
      const expiresAt = new Date(now.getTime() + validityDays * 86400000);
      const studentId = purchase.allocation === 'FAMILY' ? null : line.studentId;
      const balance = await tx.smsParentCreditBalance.create({
        data: {
          organizationId: purchase.organizationId,
          parentId: purchase.parentId,
          studentId,
          purchaseId: purchase.id,
          segmentsGranted: line.segmentAllowance,
          segmentsUsed: 0,
          segmentsRemaining: line.segmentAllowance,
          expiresAt,
        },
      });
      await tx.smsParentCreditLedger.create({
        data: {
          balanceId: balance.id,
          organizationId: purchase.organizationId,
          parentId: purchase.parentId,
          deltaSegments: line.segmentAllowance,
          reason: `Purchase ${purchase.purchaseRef} activated`,
        },
      });
    }

    await tx.smsParentPaymentTransaction.update({
      where: { purchaseId: purchase.id },
      data: { status: 'VERIFIED', verifiedAt: now, verifiedBy },
    });

    return tx.smsParentPurchase.update({
      where: { id: purchase.id },
      data: {
        status: 'ACTIVATED',
        creditsActivated: true,
        activatedAt: now,
      },
    });
  });
}

export async function getAdminPurchaseStats() {
  const [pendingApproval, pendingPayment, activated, rejected] = await Promise.all([
    prisma.smsParentPurchase.count({ where: { status: 'PENDING_APPROVAL' } }),
    prisma.smsParentPurchase.count({ where: { status: 'PENDING_PAYMENT' } }),
    prisma.smsParentPurchase.count({ where: { status: 'ACTIVATED' } }),
    prisma.smsParentPurchase.count({ where: { status: 'REJECTED' } }),
  ]);
  return { pendingApproval, pendingPayment, activated, rejected };
}

export async function listParentPurchasesForAdmin(query: {
  bucket?: 'review' | 'awaiting_payment' | 'recent' | 'all';
  organizationId?: string;
  search?: string;
}) {
  const bucket = query.bucket ?? 'review';
  let statusFilter: SmsParentPurchaseStatus[] | undefined;
  if (bucket === 'review') statusFilter = ['PENDING_APPROVAL'];
  else if (bucket === 'awaiting_payment') statusFilter = ['PENDING_PAYMENT'];
  else if (bucket === 'recent') statusFilter = ['ACTIVATED', 'REJECTED', 'PENDING_APPROVAL', 'PENDING_PAYMENT'];

  const purchases = await prisma.smsParentPurchase.findMany({
    where: {
      ...(statusFilter ? { status: { in: statusFilter } } : {}),
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
    },
    include: {
      payment: true,
      lines: { include: { package: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 150,
  });

  const orgIds = [...new Set(purchases.map((p) => p.organizationId))];
  const tenants = await prisma.tenant.findMany({
    where: { organizationId: { in: orgIds } },
    select: { organizationId: true, organizationName: true, organizationCode: true },
  });
  const orgMap = new Map(tenants.map((t) => [t.organizationId, t]));

  const q = query.search?.trim().toLowerCase();
  let rows = purchases.map((p) => {
    const org = orgMap.get(p.organizationId);
    return {
      ...mapPurchase(p),
      organizationId: p.organizationId,
      organizationName: org?.organizationName ?? 'School',
      organizationCode: org?.organizationCode ?? null,
      parentPhoneMasked: maskPhone(p.parentPhone),
      payerPhoneMasked: maskPhone(p.payerPhone),
      momoReference: p.payment?.momoReference ?? null,
      paymentSubmittedAt: p.payment?.submittedAt?.toISOString() ?? null,
      packageTitle: p.lines[0]?.package?.title ?? 'SMS Package',
      packageKind: p.lines[0]?.package?.kind ?? null,
      lineCount: p.lines.length,
    };
  });

  if (q) {
    rows = rows.filter(
      (r) =>
        r.purchaseRef.toLowerCase().includes(q) ||
        r.organizationName.toLowerCase().includes(q) ||
        (r.momoReference ?? '').toLowerCase().includes(q) ||
        r.lines?.some((l) => l.studentName.toLowerCase().includes(q))
    );
  }

  return rows;
}

export async function rejectParentPurchase(purchaseId: string, reason: string, adminId: string) {
  const trimmed = reason.trim() || 'Payment could not be verified';
  return prisma.$transaction(async (tx) => {
    const purchase = await tx.smsParentPurchase.findUnique({
      where: { id: purchaseId },
      include: { payment: true },
    });
    if (!purchase) throw new AppError(404, 'Purchase not found');
    if (purchase.creditsActivated) throw new AppError(400, 'Credits already activated');
    if (purchase.status === 'REJECTED' || purchase.status === 'ACTIVATED') {
      throw new AppError(400, 'Purchase is already finalized');
    }

    await tx.smsParentPaymentTransaction.update({
      where: { purchaseId },
      data: {
        status: 'REJECTED',
        rejectionReason: trimmed,
        verifiedBy: adminId,
        verifiedAt: new Date(),
      },
    });

    return tx.smsParentPurchase.update({
      where: { id: purchaseId },
      data: { status: 'REJECTED', rejectionReason: trimmed },
      include: { payment: true, lines: { include: { package: true } } },
    });
  });
}

export async function updateSchoolParentPackages(
  organizationId: string,
  body: {
    parentPackagesEnabled?: boolean;
    momoPayeeNumber?: string | null;
    momoUssdTemplate?: string | null;
    defaultAllocation?: SmsCreditAllocation;
    packages?: Array<{
      id?: string;
      kind: SmsParentPackageKind;
      title: string;
      priceRwf: number;
      segmentAllowance: number;
      validityDays: number;
      active?: boolean;
    }>;
  }
) {
  await prisma.smsSchoolSettings.upsert({
    where: { organizationId },
    create: {
      organizationId,
      parentPackagesEnabled: body.parentPackagesEnabled ?? false,
      momoPayeeNumber: body.momoPayeeNumber ?? null,
      momoUssdTemplate: body.momoUssdTemplate ?? null,
      defaultAllocation: body.defaultAllocation ?? 'CHILD',
    },
    update: {
      parentPackagesEnabled: body.parentPackagesEnabled,
      momoPayeeNumber: body.momoPayeeNumber ?? undefined,
      momoUssdTemplate: body.momoUssdTemplate ?? undefined,
      defaultAllocation: body.defaultAllocation,
    },
  });

  if (body.packages?.length) {
    for (const pkg of body.packages) {
      if (pkg.id) {
        await prisma.smsParentPackage.update({
          where: { id: pkg.id },
          data: {
            kind: pkg.kind,
            title: pkg.title,
            priceRwf: pkg.priceRwf,
            segmentAllowance: pkg.segmentAllowance,
            validityDays: pkg.validityDays,
            active: pkg.active ?? true,
          },
        });
      } else {
        await prisma.smsParentPackage.create({
          data: { organizationId, ...pkg, active: pkg.active ?? true },
        });
      }
    }
  }

  return getParentPortalConfig(organizationId);
}
