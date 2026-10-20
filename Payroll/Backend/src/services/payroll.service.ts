import { PayrollRunStatus, Prisma, TenantStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import { formatStaffNumber } from '../constants/payroll.constants';
import {
  calcRwandaPayroll,
  DEFAULT_ALLOWANCE_RULES,
  DEFAULT_PAYE_BRACKETS,
  DEFAULT_REGISTER_ALLOWANCE_ROWS,
  DEFAULT_STATUTORY,
  isPayrollRunDeletable,
  normalizeTemplateAllowances,
  type PayrollLineItem,
} from '../utils/rwandaPayrollEngine';
import { AppError } from '../middleware/error.middleware';
import { pushStaffToHr } from './staff-sync-push';
import { staffSyncService } from './staff-sync.service';
import { hrClient } from '../clients/hr.client';
import {
  applyKaziPayrollDeductions,
  fetchKaziAdvancesForPayroll,
} from '../clients/kazi.client';

export interface LineItemAdjust {
  name: string;
  amount: number;
  channel?: string;
}

export interface EmployeeAdjustment {
  excluded?: boolean;
  basicSalaryOverride?: number;
  transportOverride?: number;
  housingOverride?: number;
  othersOverride?: number;
  mealOverride?: number;
  extraAllowances?: LineItemAdjust[];
  extraDeductions?: LineItemAdjust[];
}

export interface RunOverrides {
  runAllowances?: LineItemAdjust[];
  runDeductions?: LineItemAdjust[];
  employeeAdjustments?: Record<string, EmployeeAdjustment>;
}

const SAMPLE_STAFF = [
  { employeeNumber: 'EMP-0001', firstName: 'Jean', lastName: 'Mukamana', department: 'Administration', position: 'Organization Administrator', basicSalary: 850000, bankName: 'Bank of Kigali', bankAccount: '0001234567', nationalId: '1199480010001001', rssbNumber: 'RSSB-001001' },
  { employeeNumber: 'EMP-0002', firstName: 'Marie', lastName: 'Uwase', department: 'Leadership', position: 'School Manager', basicSalary: 920000, bankName: 'Equity Bank', bankAccount: '0002345678', nationalId: '1199480010001002', rssbNumber: 'RSSB-001002' },
  { employeeNumber: 'EMP-0003', firstName: 'Jeanne', lastName: 'Murerwa', department: 'Teaching Staff', position: 'Teacher', basicSalary: 549419, bankName: 'Bank of Kigali', bankAccount: '0003456789', nationalId: '1199480010001003', rssbNumber: 'RSSB-001003' },
  { employeeNumber: 'EMP-0004', firstName: 'Emmanuel', lastName: 'Niyonzima', department: 'Teaching Staff', position: 'Teacher', basicSalary: 520000, bankName: 'BPR', bankAccount: '0004567890', nationalId: '1199480010001004', rssbNumber: 'RSSB-001004' },
  { employeeNumber: 'EMP-0005', firstName: 'Claudine', lastName: 'Ingabire', department: 'Finance', position: 'Accountant', basicSalary: 680000, bankName: 'I&M Bank', bankAccount: '0005678901', nationalId: '1199480010001005', rssbNumber: 'RSSB-001005' },
  { employeeNumber: 'EMP-0006', firstName: 'Patrick', lastName: 'Habimana', department: 'ICT', position: 'ICT Officer', basicSalary: 610000, bankName: 'Ecobank', bankAccount: '0006789012', nationalId: '1199480010001006', rssbNumber: 'RSSB-001006' },
  { employeeNumber: 'EMP-0007', firstName: 'Grace', lastName: 'Umutesi', department: 'Library', position: 'Librarian', basicSalary: 480000, bankName: 'Bank of Kigali', bankAccount: '0007890123', nationalId: '1199480010001007', rssbNumber: 'RSSB-001007' },
  { employeeNumber: 'EMP-0008', firstName: 'Eric', lastName: 'Mugisha', department: 'Support Staff', position: 'Security Guard', basicSalary: 320000, bankName: 'BPR', bankAccount: '0008901234', nationalId: '1199480010001008', rssbNumber: 'RSSB-001008' },
];

function mapStaff(s: Awaited<ReturnType<typeof prisma.payrollStaff.findFirst>> & object) {
  const row = s as NonNullable<typeof s> & { profile?: { basicSalary: unknown } | null };
  return {
    id: row.id,
    employeeNumber: row.employeeNumber,
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: `${row.firstName} ${row.lastName}`,
    gender: row.gender ?? 'OTHER',
    dateOfBirth: row.dateOfBirth?.toISOString() ?? null,
    hireDate: row.hireDate?.toISOString() ?? null,
    status: row.status ?? 'ACTIVE',
    department: row.department,
    position: row.position,
    nationalId: row.nationalId,
    rssbNumber: row.rssbNumber,
    email: row.email,
    phone: row.phone,
    bankName: row.bankName,
    bankAccount: row.bankAccount,
    isActive: row.isActive,
    isProtected: row.isProtected ?? false,
    hrEmployeeId: row.hrEmployeeId ?? null,
    hrProfile: row.hrProfile ?? {},
    basicSalary: row.profile ? Number(row.profile.basicSalary) : 0,
    profile: row.profile,
  };
}

function staffWhere(orgId: string): Prisma.PayrollStaffWhereInput {
  return { organizationId: orgId, deletedAt: null };
}

export class TenantService {
  async create(input: { organizationId: string; organizationName: string; organizationCode?: string }) {
    const existing = await prisma.tenant.findUnique({ where: { organizationId: input.organizationId } });
    if (existing) {
      try {
        await seedService.seed(input.organizationId, input.organizationName);
      } catch (err) {
        console.warn('[Payroll] Tenant seed skipped for existing org:', err);
      }
      return existing;
    }

    const tenant = await prisma.tenant.create({
      data: { ...input, status: TenantStatus.ACTIVE },
    });

    try {
      await seedService.seed(input.organizationId, input.organizationName);
    } catch (err) {
      console.warn('[Payroll] Tenant created but seed failed:', err);
    }

    return tenant;
  }
}

export class SeedService {
  async seed(orgId: string, orgName: string) {
    await prisma.payslipBranding.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, schoolName: orgName },
      update: { schoolName: orgName },
    });

    const y = new Date().getFullYear();
    await prisma.payrollSettings.upsert({
      where: { organizationId: orgId },
      create: {
        organizationId: orgId,
        currentAcademicYear: `${y}-${y + 1}`,
        currentTerm: 'Term 1',
        termsJson: ['Term 1', 'Term 2', 'Term 3'],
      },
      update: {},
    });

    const existingTemplate = await prisma.payrollTemplate.findFirst({
      where: { organizationId: orgId, isActive: true },
    });
    if (!existingTemplate) {
      await prisma.payrollTemplate.create({
      data: {
        organizationId: orgId,
        name: 'Default Rwanda Template',
        isActive: true,
        statutoryRates: DEFAULT_STATUTORY,
        payeRates: DEFAULT_PAYE_BRACKETS,
        allowanceRules: DEFAULT_ALLOWANCE_RULES,
        allowances: DEFAULT_REGISTER_ALLOWANCE_ROWS.map((a) => ({
          ...a,
          status: 'active',
        })),
        deductions: [
          { name: 'Welfare Fund', category: 'Welfare', amountType: 'fixed', channel: 'bank', amount: 5000, status: 'active' },
        ],
      },
    });
    }

    const staffCount = await prisma.payrollStaff.count({ where: { organizationId: orgId } });
    if (staffCount > 0) return { seeded: false };

    if (hrClient.isEnabled()) {
      try {
        const synced = await staffSyncService.syncAllFromHr(orgId);
        if (synced.total > 0) return { seeded: true, fromHr: true, count: synced.total };
      } catch (err) {
        console.warn('[Payroll] HR employee sync on seed failed:', err);
      }
    }

    for (const s of SAMPLE_STAFF) {
      const isProtected = /administrator|school manager/i.test(s.position);
      const staff = await prisma.payrollStaff.create({
        data: {
          organizationId: orgId,
          employeeNumber: s.employeeNumber,
          firstName: s.firstName,
          lastName: s.lastName,
          department: s.department,
          position: s.position,
          nationalId: s.nationalId,
          rssbNumber: s.rssbNumber,
          bankName: s.bankName,
          bankAccount: s.bankAccount,
          email: `${s.firstName.toLowerCase()}.${s.lastName.toLowerCase()}@school.local`,
          phone: `+250788${s.employeeNumber.slice(-6)}`,
          status: 'ACTIVE',
          isProtected,
        },
      });
      await prisma.staffPayrollProfile.create({
        data: {
          organizationId: orgId,
          staffId: staff.id,
          basicSalary: s.basicSalary,
        },
      });
    }
    return { seeded: true, count: SAMPLE_STAFF.length };
  }
}

export class DashboardService {
  async summary(orgId: string) {
    const tenant = await prisma.tenant.findUnique({ where: { organizationId: orgId } });
    const [staffCount, runs, paidRuns, terminations, template] = await Promise.all([
      prisma.payrollStaff.count({ where: { organizationId: orgId, isActive: true } }),
      prisma.payrollRun.count({ where: { organizationId: orgId } }),
      prisma.payrollRun.findMany({ where: { organizationId: orgId, status: 'PAID' }, orderBy: { createdAt: 'desc' }, take: 6 }),
      prisma.terminationBenefit.count({ where: { organizationId: orgId, status: { in: ['SUBMITTED', 'APPROVED'] } } }),
      prisma.payrollTemplate.findFirst({ where: { organizationId: orgId, isActive: true } }),
    ]);

    const lastPaid = paidRuns[0];
    const totals = lastPaid?.totalsJson as Record<string, number> | undefined;

    return {
      organizationId: orgId,
      organizationName: tenant?.organizationName ?? 'School',
      kpis: {
        activeStaff: staffCount,
        totalRuns: runs,
        pendingTerminations: terminations,
        lastGross: totals?.gross ?? 0,
        lastNet: totals?.finalPayable ?? 0,
        lastPaye: totals?.paye ?? 0,
        templateActive: !!template,
      },
      recentRuns: paidRuns.map((r) => ({
        id: r.id,
        runNumber: r.runNumber,
        month: r.month,
        year: r.year,
        status: r.status,
        totals: r.totalsJson,
      })),
    };
  }
}

export class TemplateService {
  async getActive(orgId: string) {
    let template =
      (await prisma.payrollTemplate.findFirst({
        where: { organizationId: orgId, isActive: true },
        orderBy: { updatedAt: 'desc' },
      })) ??
      (await prisma.payrollTemplate.findFirst({
        where: { organizationId: orgId },
        orderBy: { updatedAt: 'desc' },
      }));
    if (!template) {
      template = await prisma.payrollTemplate.create({
        data: {
          organizationId: orgId,
          statutoryRates: DEFAULT_STATUTORY,
          payeRates: DEFAULT_PAYE_BRACKETS,
          allowanceRules: DEFAULT_ALLOWANCE_RULES,
          allowances: DEFAULT_REGISTER_ALLOWANCE_ROWS.map((a) => ({ ...a, status: 'active' })),
          deductions: [],
        },
      });
    }
    return template;
  }

  async save(orgId: string, data: Record<string, unknown>) {
    const existing = await this.getActive(orgId);
    return prisma.payrollTemplate.update({
      where: { id: existing.id },
      data: {
        statutoryRates: (data.statutoryRates ?? existing.statutoryRates) as Prisma.InputJsonValue,
        payeRates: (data.payeRates ?? existing.payeRates) as Prisma.InputJsonValue,
        allowanceRules: (data.allowanceRules ?? existing.allowanceRules) as Prisma.InputJsonValue,
        allowances: (data.allowances ?? existing.allowances) as Prisma.InputJsonValue,
        deductions: (data.deductions ?? existing.deductions) as Prisma.InputJsonValue,
        name: (data.name as string) ?? existing.name,
        ...(data.isActive !== undefined ? { isActive: Boolean(data.isActive) } : {}),
      },
    });
  }

  async activate(orgId: string) {
    const template = await this.getActive(orgId);
    return prisma.$transaction(async (tx) => {
      await tx.payrollTemplate.updateMany({
        where: { organizationId: orgId },
        data: { isActive: false },
      });
      const activated = await tx.payrollTemplate.update({
        where: { id: template.id },
        data: { isActive: true, version: { increment: 1 } },
      });
      await tx.payrollTemplateVersion.create({
        data: {
          organizationId: orgId,
          templateId: activated.id,
          version: activated.version,
          snapshotJson: {
            name: activated.name,
            statutoryRates: activated.statutoryRates,
            payeRates: activated.payeRates,
            allowanceRules: activated.allowanceRules,
            allowances: activated.allowances,
            deductions: activated.deductions,
          },
        },
      });
      return activated;
    });
  }

  async deactivate(orgId: string) {
    const template = await this.getActive(orgId);
    return prisma.payrollTemplate.update({
      where: { id: template.id },
      data: { isActive: false },
    });
  }

  async preview(orgId: string, staffIds?: string[], limit = 500) {
    const template = await this.getActive(orgId);
    const staff = await prisma.payrollStaff.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
        deletedAt: null,
        ...(staffIds?.length ? { id: { in: staffIds } } : {}),
      },
      include: { profile: true, deductions: { where: { isActive: true } } },
      take: limit,
      orderBy: { lastName: 'asc' },
    });
    const avanceMap = await avanceMonthlyByStaff(orgId, staff.map((s) => s.id));
    return staff
      .filter((s) => s.profile && Number(s.profile.basicSalary) > 0)
      .map((s) => buildRegisterRow({ ...s, avanceMonthly: avanceMap.get(s.id) ?? 0 }, template))
      .filter(Boolean);
  }

  async history(orgId: string) {
    return prisma.payrollTemplateVersion.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}

export class DeductionService {
  async list(orgId: string, staffId?: string) {
    const rows = await prisma.employeeDeduction.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
        ...(staffId ? { staffId } : {}),
      },
      include: { staff: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((d) => ({
      id: d.id,
      staffId: d.staffId,
      staffName: `${d.staff.firstName} ${d.staff.lastName}`,
      employeeNumber: d.staff.employeeNumber,
      name: d.name,
      amount: Number(d.amount),
      amountType: d.amountType,
      channel: d.channel,
      isActive: d.isActive,
      createdAt: d.createdAt,
    }));
  }

  async create(orgId: string, data: Record<string, unknown>) {
    const staffId = String(data.staffId);
    const staff = await prisma.payrollStaff.findFirst({ where: { id: staffId, organizationId: orgId } });
    if (!staff) throw new AppError(404, 'Staff not found');
    return prisma.employeeDeduction.create({
      data: {
        organizationId: orgId,
        staffId,
        name: String(data.name ?? 'Deduction'),
        amount: Number(data.amount ?? 0),
        amountType: String(data.amountType ?? 'fixed'),
        channel: String(data.channel ?? 'tax'),
      },
    });
  }

  async update(orgId: string, id: string, data: Record<string, unknown>) {
    const existing = await prisma.employeeDeduction.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new AppError(404, 'Deduction not found');
    return prisma.employeeDeduction.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: String(data.name) } : {}),
        ...(data.amount !== undefined ? { amount: Number(data.amount) } : {}),
        ...(data.amountType !== undefined ? { amountType: String(data.amountType) } : {}),
        ...(data.channel !== undefined ? { channel: String(data.channel) } : {}),
        ...(data.isActive !== undefined ? { isActive: Boolean(data.isActive) } : {}),
      },
    });
  }

  async delete(orgId: string, id: string) {
    const existing = await prisma.employeeDeduction.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new AppError(404, 'Deduction not found');
    await prisma.employeeDeduction.update({ where: { id }, data: { isActive: false } });
    return { success: true };
  }
}

/**
 * Monthly salary-advance deduction per payroll staff.
 * Prefers live KaziAdvance balances; falls back to local shule_avance_requests.
 */
async function avanceMonthlyByStaff(orgId: string, staffIds: string[]) {
  if (!staffIds.length) return new Map<string, number>();

  const localRows = await prisma.shuleAvanceRequest.findMany({
    where: { organizationId: orgId, staffId: { in: staffIds }, status: 'APPROVED' },
  });
  const localMap = new Map<string, number>();
  for (const row of localRows) {
    localMap.set(row.staffId, (localMap.get(row.staffId) ?? 0) + Number(row.monthlyPayment));
  }

  const staff = await prisma.payrollStaff.findMany({
    where: { organizationId: orgId, id: { in: staffIds } },
    select: { id: true, employeeNumber: true, email: true },
  });
  const byCode = new Map(staff.map((s) => [s.employeeNumber, s.id]));
  const byEmail = new Map(
    staff
      .filter((s) => s.email)
      .map((s) => [s.email!.toLowerCase(), s.id])
  );

  const kaziAdvances = await fetchKaziAdvancesForPayroll(orgId);
  const kaziMap = new Map<string, number>();
  for (const adv of kaziAdvances) {
    const staffId =
      byCode.get(adv.employeeCode) ||
      (adv.email ? byEmail.get(adv.email.toLowerCase()) : undefined);
    if (!staffId || !staffIds.includes(staffId)) continue;
    const amount = Math.max(0, Math.round(Number(adv.monthlyDeduction) || 0));
    if (amount <= 0) continue;
    kaziMap.set(staffId, (kaziMap.get(staffId) ?? 0) + amount);
  }

  const map = new Map<string, number>();
  for (const id of staffIds) {
    const kazi = kaziMap.get(id) ?? 0;
    const local = localMap.get(id) ?? 0;
    // Prefer KaziAdvance when present so Run Payroll uses live advances
    map.set(id, kazi > 0 ? kazi : local);
  }
  return map;
}

function profileAmount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function buildRegisterRow(
  staff: {
    id: string; employeeNumber: string; firstName: string; lastName: string;
    department: string | null; position: string | null; bankName: string | null; bankAccount: string | null;
    profile: {
      basicSalary: unknown; transportAllowance: unknown; housingAllowance: unknown;
      othersAllowance: unknown; mealAllowance: unknown; otherAllowances?: unknown;
    } | null;
    deductions: { name: string; amount: unknown; channel: string; amountType?: string }[];
    avanceMonthly?: number;
  },
  template: {
    allowanceRules: unknown; statutoryRates: unknown; payeRates: unknown;
    deductions: unknown; allowances?: unknown;
  },
  overrides?: { employee?: EmployeeAdjustment; runAllowances?: LineItemAdjust[]; runDeductions?: LineItemAdjust[] }
) {
  if (overrides?.employee?.excluded) return null;

  const profile = staff.profile;
  const emp = overrides?.employee;
  const basic = emp?.basicSalaryOverride ?? profileAmount(profile?.basicSalary);
  const rules = { ...DEFAULT_ALLOWANCE_RULES, ...(template.allowanceRules as object) };
  const transport = emp?.transportOverride ?? profileAmount(profile?.transportAllowance);
  const housing = emp?.housingOverride ?? profileAmount(profile?.housingAllowance);
  const others = emp?.othersOverride ?? profileAmount(profile?.othersAllowance);
  const hasManualRegister = transport > 0 || housing > 0 || others > 0;

  const profileOtherAllowances = Array.isArray(profile?.otherAllowances)
    ? (profile!.otherAllowances as { name: string; amount: number; channel?: string }[])
    : [];

  const templateDeductions = (template.deductions as { name: string; amount: number; amountType?: string; channel?: string }[]).map((d) => ({
    name: d.name,
    amount: Number(d.amount),
    amountType: d.amountType,
    channel: d.channel,
  }));
  const templateAllowances = normalizeTemplateAllowances(
    (template.allowances ?? []) as PayrollLineItem[]
  ).map((a) => ({
    name: a.name,
    amount: Number(a.amount),
    amountType: a.amountType,
    channel: a.channel,
    registerKey: a.registerKey,
  }));
  const runDeductions = (overrides?.runDeductions ?? []).map((d) => ({
    name: d.name,
    amount: Number(d.amount),
    channel: d.channel,
  }));
  const employeeExtraDeductions = (emp?.extraDeductions ?? []).map((d) => ({
    name: d.name,
    amount: Number(d.amount),
    channel: d.channel,
  }));
  const runAllowances = (overrides?.runAllowances ?? []).map((d) => ({
    name: d.name,
    amount: Number(d.amount),
    channel: d.channel,
  }));
  const employeeExtraAllowances = (emp?.extraAllowances ?? []).map((d) => ({
    name: d.name,
    amount: Number(d.amount),
    channel: d.channel,
  }));

  const avanceDeductions =
    staff.avanceMonthly && staff.avanceMonthly > 0
      ? [{ name: 'Kazi Avance', amount: staff.avanceMonthly, channel: 'tax' }]
      : [];

  const calc = calcRwandaPayroll({
    basicSalary: basic,
    transport,
    housing,
    others,
    meal: emp?.mealOverride ?? profileAmount(profile?.mealAllowance),
    autoAllowances: rules.enabled !== false && !hasManualRegister,
    allowanceRules: rules,
    statutory: template.statutoryRates as Record<string, number>,
    payeRates: template.payeRates as { upTo: number | null; rate: number }[],
    templateAllowances,
    templateDeductions: [...templateDeductions, ...runDeductions],
    employeeDeductions: [
      ...staff.deductions.map((d) => ({
        name: d.name,
        amount: Number(d.amount),
        amountType: d.amountType,
        channel: d.channel,
      })),
      ...employeeExtraDeductions,
      ...avanceDeductions,
    ],
    extraAllowances: [
      ...profileOtherAllowances.map((a) => ({
        name: a.name,
        amount: Number(a.amount),
        channel: a.channel,
      })),
      ...runAllowances,
      ...employeeExtraAllowances,
    ],
  });

  return {
    staffId: staff.id,
    employeeNumber: staff.employeeNumber,
    employeeName: `${staff.firstName} ${staff.lastName}`,
    department: staff.department,
    position: staff.position,
    bankName: staff.bankName,
    bankAccount: staff.bankAccount,
    avanceMonthly: staff.avanceMonthly ?? 0,
    ...calc,
  };
}

export class StaffService {
  async list(orgId: string, search?: string) {
    const where: Prisma.PayrollStaffWhereInput = {
      ...staffWhere(orgId),
      isActive: true,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' as const } },
              { lastName: { contains: search, mode: 'insensitive' as const } },
              { employeeNumber: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const items = await prisma.payrollStaff.findMany({
      where,
      include: { profile: true },
      orderBy: { lastName: 'asc' },
    });
    return items.map(mapStaff);
  }

  async directory(orgId: string, filters: Record<string, string | undefined>) {
    const where: Prisma.PayrollStaffWhereInput = staffWhere(orgId);

    if (filters.search) {
      const q = filters.search;
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { employeeNumber: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { position: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (filters.status) where.status = filters.status;

    const page = Math.max(1, parseInt(filters.page ?? '1', 10));
    const limit = Math.min(50, Math.max(10, parseInt(filters.limit ?? '10', 10)));
    const skip = (page - 1) * limit;

    const [items, total, allActive] = await Promise.all([
      prisma.payrollStaff.findMany({
        where,
        include: { profile: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.payrollStaff.count({ where }),
      prisma.payrollStaff.findMany({
        where: staffWhere(orgId),
        include: { profile: true },
      }),
    ]);

    const totalAll = allActive.length;
    const activeCount = allActive.filter((e) => e.status === 'ACTIVE').length;
    const teachers = allActive.filter((e) => /teacher|instructor/i.test(e.position ?? '')).length;
    const onLeave = allActive.filter((e) => e.status === 'ON_LEAVE').length;

    return {
      data: items.map(mapStaff),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      stats: {
        total: totalAll,
        active: activeCount,
        activeRate: totalAll ? Math.round((activeCount / totalAll) * 100) : 0,
        teachers,
        teacherRate: totalAll ? Math.round((teachers / totalAll) * 100) : 0,
        onLeave,
        onLeaveRate: totalAll ? Math.round((onLeave / totalAll) * 100) : 0,
        withSalary: allActive.filter((e) => e.profile && Number(e.profile.basicSalary) > 0).length,
      },
    };
  }

  async getById(orgId: string, id: string) {
    const staff = await prisma.payrollStaff.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: { profile: true },
    });
    if (!staff) throw new AppError(404, 'Staff not found');
    return mapStaff(staff);
  }

  async create(orgId: string, data: Record<string, unknown>) {
    const count = await prisma.payrollStaff.count({ where: { organizationId: orgId } });
    const employeeNumber = formatStaffNumber(count + 1);

    const staff = await prisma.payrollStaff.create({
      data: {
        organizationId: orgId,
        employeeNumber,
        firstName: String(data.firstName),
        lastName: String(data.lastName),
        gender: data.gender ? String(data.gender) : 'OTHER',
        dateOfBirth: data.dateOfBirth ? new Date(String(data.dateOfBirth)) : null,
        hireDate: data.hireDate ? new Date(String(data.hireDate)) : new Date(),
        email: data.email ? String(data.email) : null,
        phone: data.phone ? String(data.phone) : null,
        nationalId: data.nationalId ? String(data.nationalId) : null,
        rssbNumber: data.rssbNumber ? String(data.rssbNumber) : null,
        department: data.department ? String(data.department) : null,
        position: data.position ? String(data.position) : 'Staff',
        bankName: data.bankName ? String(data.bankName) : null,
        bankAccount: data.bankAccount ? String(data.bankAccount) : null,
        status: data.status ? String(data.status) : 'ACTIVE',
        isActive: data.status !== 'TERMINATED',
        hrProfile: (data.hrProfile as Prisma.InputJsonValue) ?? {},
      },
    });

    if (data.basicSalary !== undefined || data.transportAllowance !== undefined) {
      await prisma.staffPayrollProfile.create({
        data: {
          organizationId: orgId,
          staffId: staff.id,
          basicSalary: Number(data.basicSalary ?? 0),
          transportAllowance: Number(data.transportAllowance ?? 0),
          housingAllowance: Number(data.housingAllowance ?? 0),
          othersAllowance: Number(data.othersAllowance ?? 0),
          mealAllowance: Number(data.mealAllowance ?? 0),
        },
      });
    }

    const result = await this.getById(orgId, staff.id);
    void pushStaffToHr(orgId, staff.id).catch((err) =>
      console.warn('[Payroll] HR sync failed after create:', err)
    );
    return result;
  }

  async update(orgId: string, id: string, data: Record<string, unknown>) {
    const existing = await prisma.payrollStaff.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, 'Staff not found');

    const updateData: Prisma.PayrollStaffUpdateInput = {};
    const fields = [
      'firstName', 'lastName', 'email', 'phone', 'nationalId', 'rssbNumber',
      'department', 'position', 'bankName', 'bankAccount', 'gender', 'status',
    ] as const;
    for (const f of fields) {
      if (data[f] !== undefined) (updateData as Record<string, unknown>)[f] = data[f];
    }
    if (data.dateOfBirth) updateData.dateOfBirth = new Date(String(data.dateOfBirth));
    if (data.hireDate) updateData.hireDate = new Date(String(data.hireDate));
    if (data.hrProfile) updateData.hrProfile = data.hrProfile as Prisma.InputJsonValue;
    if (data.status) updateData.isActive = data.status !== 'TERMINATED';

    await prisma.payrollStaff.update({ where: { id }, data: updateData });

    if (
      data.basicSalary !== undefined ||
      data.transportAllowance !== undefined ||
      data.housingAllowance !== undefined ||
      data.othersAllowance !== undefined ||
      data.mealAllowance !== undefined
    ) {
      await prisma.staffPayrollProfile.upsert({
        where: { staffId: id },
        create: {
          organizationId: orgId,
          staffId: id,
          basicSalary: Number(data.basicSalary ?? 0),
          transportAllowance: Number(data.transportAllowance ?? 0),
          housingAllowance: Number(data.housingAllowance ?? 0),
          othersAllowance: Number(data.othersAllowance ?? 0),
          mealAllowance: Number(data.mealAllowance ?? 0),
        },
        update: {
          basicSalary: Number(data.basicSalary ?? 0),
          transportAllowance: Number(data.transportAllowance ?? 0),
          housingAllowance: Number(data.housingAllowance ?? 0),
          othersAllowance: Number(data.othersAllowance ?? 0),
          mealAllowance: Number(data.mealAllowance ?? 0),
        },
      });
    }

    const result = await this.getById(orgId, id);
    void pushStaffToHr(orgId, id).catch((err) =>
      console.warn('[Payroll] HR sync failed after update:', err)
    );
    return result;
  }

  async softDelete(orgId: string, id: string) {
    const staff = await prisma.payrollStaff.findFirst({ where: { id, organizationId: orgId, deletedAt: null } });
    if (!staff) throw new AppError(404, 'Staff not found');
    if (staff.isProtected) {
      throw new AppError(400, 'Cannot delete protected employee');
    }
    await prisma.payrollStaff.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'TERMINATED', isActive: false },
    });
    void pushStaffToHr(orgId, id).catch((err) =>
      console.warn('[Payroll] HR sync failed after delete:', err)
    );
    return { success: true };
  }

  async bulkDelete(orgId: string, ids: string[]) {
    const staff = await prisma.payrollStaff.findMany({
      where: { id: { in: ids }, organizationId: orgId, deletedAt: null },
    });
    const deletable = staff.filter((e) => !e.isProtected).map((e) => e.id);
    const skipped = staff.length - deletable.length;
    if (deletable.length) {
      await prisma.payrollStaff.updateMany({
        where: { id: { in: deletable }, organizationId: orgId },
        data: { deletedAt: new Date(), status: 'TERMINATED', isActive: false },
      });
      for (const id of deletable) {
        void pushStaffToHr(orgId, id).catch((err) =>
          console.warn('[Payroll] HR sync failed after bulk delete:', err)
        );
      }
    }
    return { success: true, count: deletable.length, skippedProtected: skipped };
  }

  async allForMatching(orgId: string) {
    return prisma.payrollStaff.findMany({
      where: staffWhere(orgId),
      select: {
        id: true,
        nationalId: true,
        rssbNumber: true,
        email: true,
        phone: true,
        isProtected: true,
        position: true,
        firstName: true,
        lastName: true,
      },
    });
  }

  async getProfile(orgId: string, staffId: string) {
    const staff = await prisma.payrollStaff.findFirst({
      where: { id: staffId, organizationId: orgId },
      include: { profile: true, deductions: { where: { isActive: true } } },
    });
    if (!staff) throw new AppError(404, 'Staff not found');
    const template = await templateService.getActive(orgId);
    const avanceMap = await avanceMonthlyByStaff(orgId, [staffId]);
    return {
      staff: mapStaff(staff),
      deductions: staff.deductions,
      calc: buildRegisterRow({ ...staff, avanceMonthly: avanceMap.get(staffId) ?? 0 }, template),
    };
  }

  async listForKaziSync(orgId: string) {
    const template = await templateService.getActive(orgId);
    const staff = await prisma.payrollStaff.findMany({
      where: { ...staffWhere(orgId), isActive: true },
      include: { profile: true, deductions: { where: { isActive: true } } },
      orderBy: { lastName: 'asc' },
    });
    const avanceMap = await avanceMonthlyByStaff(orgId, staff.map((s) => s.id));

    return staff
      .map((s) => {
        const calc = buildRegisterRow({ ...s, avanceMonthly: avanceMap.get(s.id) ?? 0 }, template);
        if (!calc) return null;
        return {
          payrollStaffId: s.id,
          hrEmployeeId: s.hrEmployeeId,
          employeeNumber: s.employeeNumber,
          email: s.email,
          phone: s.phone,
          fullName: `${s.firstName} ${s.lastName}`.trim(),
          department: s.department,
          position: s.position,
          status: s.status,
          bankName: s.bankName,
          bankAccount: s.bankAccount,
          basicSalary: calc.basicSalary,
          grossSalary: calc.gross,
          allowances: calc.transport + calc.housing + calc.others + calc.meal,
          paye: calc.paye,
          rssbEmployee: calc.rssbEmployee,
          ramaEmployee: calc.ramaEmployee,
          otherDeductions: calc.templateDeductionTotal + calc.employeeDeductionTotal,
          taxAmount: calc.paye + calc.rssbEmployee + calc.ramaEmployee,
          deductions: calc.templateDeductionTotal + calc.employeeDeductionTotal + calc.avanceMonthly,
          netSalary: calc.netSalary,
        };
      })
      .filter(Boolean);
  }

  async saveProfile(orgId: string, staffId: string, data: Record<string, unknown>) {
    const staff = await prisma.payrollStaff.findFirst({ where: { id: staffId, organizationId: orgId } });
    if (!staff) throw new AppError(404, 'Staff not found');

    await prisma.staffPayrollProfile.upsert({
      where: { staffId },
      create: {
        organizationId: orgId,
        staffId,
        basicSalary: Number(data.basicSalary ?? 0),
        transportAllowance: Number(data.transportAllowance ?? 0),
        housingAllowance: Number(data.housingAllowance ?? 0),
        othersAllowance: Number(data.othersAllowance ?? 0),
        mealAllowance: Number(data.mealAllowance ?? 0),
        otherAllowances: (data.otherAllowances !== undefined ? data.otherAllowances : []) as Prisma.InputJsonValue,
        useNetToGross: Boolean(data.useNetToGross),
        desiredNet: data.desiredNet ? Number(data.desiredNet) : null,
      },
      update: {
        basicSalary: Number(data.basicSalary ?? 0),
        transportAllowance: Number(data.transportAllowance ?? 0),
        housingAllowance: Number(data.housingAllowance ?? 0),
        othersAllowance: Number(data.othersAllowance ?? 0),
        mealAllowance: Number(data.mealAllowance ?? 0),
        ...(data.otherAllowances !== undefined
          ? { otherAllowances: data.otherAllowances as Prisma.InputJsonValue }
          : {}),
        useNetToGross: Boolean(data.useNetToGross),
        desiredNet: data.desiredNet ? Number(data.desiredNet) : null,
      },
    });
    const result = await this.getProfile(orgId, staffId);
    void import('./teacher-portal-sync.service').then(({ syncStaffSalaryToTeacherPortal }) =>
      syncStaffSalaryToTeacherPortal(orgId, staffId)
    );
    return result;
  }
}

export class RunService {
  async list(orgId: string, filters: { month?: number; year?: number; academicYear?: string; status?: string }) {
    return prisma.payrollRun.findMany({
      where: {
        organizationId: orgId,
        ...(filters.month ? { month: filters.month } : {}),
        ...(filters.year ? { year: filters.year } : {}),
        ...(filters.academicYear ? { academicYear: filters.academicYear } : {}),
        ...(filters.status ? { status: filters.status as never } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(orgId: string, id: string) {
    const run = await prisma.payrollRun.findFirst({
      where: { id, organizationId: orgId },
      include: { lines: { include: { staff: true } } },
    });
    if (!run) throw new AppError(404, 'Payroll run not found');
    return run;
  }

  async preview(orgId: string, params: { month: number; year: number; staffIds?: string[]; overrides?: RunOverrides }) {
    const template = await templateService.getActive(orgId);
    const overrides = params.overrides ?? {};
    const staff = await prisma.payrollStaff.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
        deletedAt: null,
        ...(params.staffIds?.length ? { id: { in: params.staffIds } } : {}),
      },
      include: { profile: true, deductions: { where: { isActive: true } } },
    });
    const missingBasic = staff.filter((s) => !s.profile || Number(s.profile.basicSalary) <= 0);
    const avanceMap = await avanceMonthlyByStaff(orgId, staff.map((s) => s.id));
    const rows = staff
      .map((s) =>
        buildRegisterRow({ ...s, avanceMonthly: avanceMap.get(s.id) ?? 0 }, template, {
          employee: overrides.employeeAdjustments?.[s.id],
          runAllowances: overrides.runAllowances,
          runDeductions: overrides.runDeductions,
        })
      )
      .filter((r): r is NonNullable<typeof r> => r !== null && r.basicSalary > 0);
    const totals = rows.reduce(
      (acc, r) => ({
        gross: acc.gross + r.gross,
        paye: acc.paye + r.paye,
        netSalary: acc.netSalary + r.netSalary,
        finalPayable: acc.finalPayable + r.finalPayable,
        rssbEmployee: acc.rssbEmployee + r.rssbEmployee,
        rssbEmployer: acc.rssbEmployer + r.rssbEmployer,
      }),
      { gross: 0, paye: 0, netSalary: 0, finalPayable: 0, rssbEmployee: 0, rssbEmployer: 0 }
    );
    return { rows, totals, missingBasic: missingBasic.map(mapStaff), templateActive: template.isActive, overrides };
  }

  async trigger(orgId: string, userId: string, params: {
    month: number; year: number; academicYear?: string; term?: string; staffIds?: string[]; overrides?: RunOverrides;
  }) {
    const settings = await settingsService.get(orgId);
    const academicYear = params.academicYear?.trim() || settings.currentAcademicYear;
    const term = params.term?.trim() || settings.currentTerm || undefined;

    const existingPaid = await prisma.payrollRun.findFirst({
      where: { organizationId: orgId, month: params.month, year: params.year, status: 'PAID' },
    });
    if (existingPaid) throw new AppError(400, 'Period already has a paid payroll run');

    const preview = await this.preview(orgId, params);
    if (!preview.rows.length) throw new AppError(400, 'No staff with basic salary configured');

    const count = await prisma.payrollRun.count({ where: { organizationId: orgId } });
    const runNumber = `PR-${params.year}${String(params.month).padStart(2, '0')}-${String(count + 1).padStart(3, '0')}`;

    const run = await prisma.payrollRun.create({
      data: {
        organizationId: orgId,
        runNumber,
        academicYear,
        month: params.month,
        year: params.year,
        term,
        status: PayrollRunStatus.PROCESSING,
        registerJson: preview.rows,
        totalsJson: { ...preview.totals, headcount: preview.rows.length },
        runOverridesJson: (params.overrides ?? {}) as Prisma.InputJsonValue,
        createdBy: userId,
        lines: {
          create: preview.rows.map((row) => ({
            organizationId: orgId,
            staffId: row.staffId,
            lineJson: row,
            paymentStatus: 'pending',
          })),
        },
      },
      include: { lines: true },
    });

    await prisma.payrollAuditLog.create({
      data: {
        organizationId: orgId,
        runId: run.id,
        action: 'RUN_TRIGGERED',
        detailJson: { runNumber, month: params.month, year: params.year, headcount: preview.rows.length },
        createdBy: userId,
      },
    });

    return run;
  }

  async markPaid(orgId: string, id: string, userId: string, payload: { paymentDate?: string; paymentRef?: string }) {
    const run = await this.get(orgId, id);
    if (run.status === 'PAID') throw new AppError(400, 'Run already paid');
    if (run.status !== 'PROCESSING') throw new AppError(400, 'Only processing runs can be marked paid');

    const updated = await prisma.$transaction(async (tx) => {
      const paid = await tx.payrollRun.update({
        where: { id },
        data: {
          status: PayrollRunStatus.PAID,
          paymentDate: payload.paymentDate ? new Date(payload.paymentDate) : new Date(),
          paymentRef: payload.paymentRef,
        },
      });
      await tx.payrollRunLine.updateMany({
        where: { runId: id },
        data: { paymentStatus: 'paid' },
      });
      await tx.payrollAuditLog.create({
        data: {
          organizationId: orgId,
          runId: id,
          action: 'RUN_PAID',
          detailJson: {
            runNumber: run.runNumber,
            month: run.month,
            year: run.year,
            paymentRef: payload.paymentRef ?? null,
          },
          createdBy: userId,
        },
      });
      return paid;
    });

    // Push KaziAdvance installment payments for rows that had avance deductions
    const registerRows = Array.isArray(run.registerJson)
      ? (run.registerJson as Array<{
          employeeNumber?: string;
          staffId?: string;
          avanceMonthly?: number;
        }>)
      : [];
    const staffIds = registerRows.map((r) => r.staffId).filter(Boolean) as string[];
    const staffEmailById = new Map(
      (
        await prisma.payrollStaff.findMany({
          where: { organizationId: orgId, id: { in: staffIds } },
          select: { id: true, email: true },
        })
      ).map((s) => [s.id, s.email])
    );

    const items = registerRows
      .filter((r) => Number(r.avanceMonthly) > 0)
      .map((r) => ({
        employeeCode: r.employeeNumber ?? null,
        email: r.staffId ? staffEmailById.get(r.staffId) ?? null : null,
        amount: Math.round(Number(r.avanceMonthly) || 0),
      }));

    if (items.length) {
      await applyKaziPayrollDeductions({
        organizationId: orgId,
        month: run.month,
        year: run.year,
        paymentRef: payload.paymentRef ?? run.paymentRef,
        items,
      });
    }

    void import('./teacher-portal-sync.service').then(({ syncPaidRunToTeacherPortal }) =>
      syncPaidRunToTeacherPortal(orgId, id)
    );

    return updated;
  }

  async deleteRun(orgId: string, id: string, userId: string) {
    const run = await this.get(orgId, id);
    if (!isPayrollRunDeletable(run.status)) throw new AppError(400, 'Only processing payroll runs can be deleted');
    await prisma.$transaction(async (tx) => {
      await tx.payrollAuditLog.create({
        data: {
          organizationId: orgId,
          runId: id,
          action: 'RUN_DELETED',
          detailJson: { runNumber: run.runNumber, month: run.month, year: run.year, status: run.status },
          createdBy: userId,
        },
      });
      await tx.payrollRun.delete({ where: { id } });
    });
    return { success: true };
  }
}

export class TerminationService {
  async list(orgId: string) {
    return prisma.terminationBenefit.findMany({
      where: { organizationId: orgId },
      include: { staff: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(orgId: string, data: Record<string, unknown>) {
    const staff = await prisma.payrollStaff.findFirst({
      where: { id: String(data.staffId), organizationId: orgId },
      include: { profile: true },
    });
    if (!staff) throw new AppError(404, 'Staff not found');
    const net = staff.profile ? Number(staff.profile.basicSalary) * 0.7 : 0;
    const years = Number(data.yearsWorked ?? 3);
    const severance = Math.round(net * Math.min(years * 0.5, 3));
    const outstanding = Number(data.outstandingDeductions ?? 0);
    return prisma.terminationBenefit.create({
      data: {
        organizationId: orgId,
        staffId: staff.id,
        terminationDate: new Date(String(data.terminationDate)),
        reason: data.reason ? String(data.reason) : null,
        notes: data.notes ? String(data.notes) : null,
        yearsWorked: years,
        severanceAmount: severance,
        outstandingDeductions: outstanding,
        totalPayable: severance - outstanding,
        status: 'DRAFT',
      },
      include: { staff: true },
    });
  }

  async updateStatus(orgId: string, id: string, status: 'SUBMITTED' | 'APPROVED' | 'PAID' | 'REJECTED') {
    const rec = await prisma.terminationBenefit.findFirst({ where: { id, organizationId: orgId } });
    if (!rec) throw new AppError(404, 'Termination not found');
    return prisma.terminationBenefit.update({ where: { id }, data: { status } });
  }
}

export class DisbursementService {
  async rules(orgId: string) {
    return prisma.disbursementRule.findMany({ where: { organizationId: orgId, isActive: true } });
  }

  async createRule(orgId: string, data: Record<string, unknown>) {
    return prisma.disbursementRule.create({
      data: {
        organizationId: orgId,
        name: String(data.name),
        deductionType: String(data.deductionType ?? data.name),
        applyTo: String(data.applyTo ?? 'all'),
        amount: Number(data.amount),
        amountType: String(data.amountType ?? 'fixed'),
      },
    });
  }

  async paymentRows(orgId: string, runId: string) {
    const run = await runService.get(orgId, runId);
    return run.lines.map((l) => ({
      ...(l.lineJson as object),
      paymentStatus: l.paymentStatus,
      staffId: l.staffId,
    }));
  }

  groupByBank(rows: { bankName?: string | null; finalPayable?: number; employeeName?: string; bankAccount?: string | null }[]) {
    const map = new Map<string, typeof rows>();
    for (const r of rows) {
      const bank = r.bankName ?? 'Unknown Bank';
      if (!map.has(bank)) map.set(bank, []);
      map.get(bank)!.push(r);
    }
    return Array.from(map.entries()).map(([bankName, employees]) => ({
      bankName,
      employeeCount: employees.length,
      totalAmount: employees.reduce((s, e) => s + (e.finalPayable ?? 0), 0),
      employees,
    }));
  }

  async applyScheduledDeductions(orgId: string, runId: string, userId?: string) {
    const run = await runService.get(orgId, runId);
    const rules = await this.rules(orgId);
    const rows = (run.registerJson as { staffId?: string; department?: string; finalPayable?: number }[]) ?? [];
    const applied: { staffId: string; rule: string; amount: number }[] = [];

    for (const row of rows) {
      for (const rule of rules) {
        const applies =
          rule.applyTo === 'all' ||
          (row.department && rule.applyTo.toLowerCase() === row.department.toLowerCase());
        if (!applies) continue;
        const base = Number(row.finalPayable ?? 0);
        const amt =
          rule.amountType === 'percent'
            ? Math.round(base * Number(rule.amount) / 100)
            : Math.round(Number(rule.amount));
        applied.push({ staffId: String(row.staffId), rule: rule.name, amount: amt });
      }
    }

    await prisma.payrollAuditLog.create({
      data: {
        organizationId: orgId,
        runId,
        action: 'APPLY_SCHEDULED_DEDUCTIONS',
        detailJson: { applied, ruleCount: rules.length },
        createdBy: userId,
      },
    });

    return { applied, count: applied.length, rulesApplied: rules.length };
  }

  async auditTrail(orgId: string, runId?: string) {
    return prisma.payrollAuditLog.findMany({
      where: { organizationId: orgId, ...(runId ? { runId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}

export class BrandingService {
  async get(orgId: string) {
    return prisma.payslipBranding.findUnique({ where: { organizationId: orgId } });
  }

  async save(orgId: string, data: Record<string, unknown>) {
    return prisma.payslipBranding.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, ...data as object },
      update: data as object,
    });
  }
}

export class SettingsService {
  private defaultAcademicYear() {
    const y = new Date().getFullYear();
    return `${y}-${y + 1}`;
  }

  async get(orgId: string) {
    let settings = await prisma.payrollSettings.findUnique({ where: { organizationId: orgId } });
    if (!settings) {
      settings = await prisma.payrollSettings.create({
        data: {
          organizationId: orgId,
          currentAcademicYear: this.defaultAcademicYear(),
          currentTerm: 'Term 1',
          termsJson: ['Term 1', 'Term 2', 'Term 3'],
          calendarJson: {},
        },
      });
    }
    return settings;
  }

  async save(orgId: string, data: Record<string, unknown>) {
    const existing = await this.get(orgId);
    return prisma.payrollSettings.update({
      where: { id: existing.id },
      data: {
        ...(data.currentAcademicYear !== undefined ? { currentAcademicYear: String(data.currentAcademicYear) } : {}),
        ...(data.currentTerm !== undefined ? { currentTerm: String(data.currentTerm) } : {}),
        ...(data.termsJson !== undefined ? { termsJson: data.termsJson as Prisma.InputJsonValue } : {}),
        ...(data.calendarJson !== undefined ? { calendarJson: data.calendarJson as Prisma.InputJsonValue } : {}),
      },
    });
  }
}

export class AdvanceService {
  async getCheck(orgId: string, staffId: string) {
    const staff = await prisma.payrollStaff.findFirst({ where: { id: staffId, organizationId: orgId } });
    if (!staff) throw new AppError(404, 'Staff not found');

    const local = await prisma.shuleAvanceRequest.findMany({
      where: { organizationId: orgId, staffId, status: 'APPROVED' },
    });

    const kaziAll = await fetchKaziAdvancesForPayroll(orgId);
    const kazi = kaziAll.filter(
      (a) =>
        a.employeeCode === staff.employeeNumber ||
        (staff.email && a.email?.toLowerCase() === staff.email.toLowerCase())
    );

    const monthlyDeduction =
      kazi.length > 0
        ? kazi.reduce((s, a) => s + Number(a.monthlyDeduction), 0)
        : local.reduce((s, a) => s + Number(a.monthlyPayment), 0);
    const remainingBalance =
      kazi.length > 0
        ? kazi.reduce((s, a) => s + Number(a.remainingBalance), 0)
        : local.reduce((s, a) => s + Number(a.remainingBalance), 0);

    const requests =
      kazi.length > 0
        ? kazi.map((a) => ({
            id: a.advanceId,
            requestNumber: a.requestNumber,
            amount: a.approvedAmount,
            monthlyPayment: a.monthlyDeduction,
            remainingBalance: a.remainingBalance,
            repaymentMonths: a.repaymentMonths,
            source: 'kaziavance' as const,
          }))
        : local.map((a) => ({
            id: a.id,
            amount: Number(a.amount),
            monthlyPayment: Number(a.monthlyPayment),
            remainingBalance: Number(a.remainingBalance),
            repaymentMonths: a.repaymentMonths,
            approvedAt: a.approvedAt,
            source: 'local' as const,
          }));

    return {
      staffId,
      staffName: `${staff.firstName} ${staff.lastName}`,
      hasActiveAdvance: requests.length > 0,
      activeCount: requests.length,
      monthlyDeduction,
      remainingBalance,
      source: kazi.length > 0 ? 'kaziavance' : local.length > 0 ? 'local' : 'none',
      requests,
    };
  }
}

export const tenantService = new TenantService();
export const seedService = new SeedService();
export const dashboardService = new DashboardService();
export const templateService = new TemplateService();
export const deductionService = new DeductionService();
export const staffService = new StaffService();
export const runService = new RunService();
export const terminationService = new TerminationService();
export const disbursementService = new DisbursementService();
export const brandingService = new BrandingService();
export const settingsService = new SettingsService();
export const advanceService = new AdvanceService();
