import { prisma } from '../config/database';
import { schoolFeesModuleClient, type SchoolFeesClassAnalytics } from '../clients/school-fees-module.client';
import { RepresentativeAssignmentStatus } from '../generated/prisma';
import { academicSettingsService } from './academic-settings.service';

export type FinanceAssignmentSource = 'representative' | 'chief';

async function assignedSchools(
  userId: string,
  organizationId?: string,
  source: FinanceAssignmentSource = 'representative'
) {
  const now = new Date();
  const assignmentWhere = {
    userId,
    status: RepresentativeAssignmentStatus.ACTIVE,
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    ...(organizationId && organizationId !== 'all' ? { organizationId } : {}),
  };
  const assignments =
    source === 'chief'
      ? await prisma.chiefAccountantAssignment.findMany({
          where: assignmentWhere,
          select: { organizationId: true },
        })
      : await prisma.schoolRepresentativeAssignment.findMany({
          where: assignmentWhere,
          select: { organizationId: true },
        });
  const ids = assignments.map((a) => a.organizationId);
  if (!ids.length) return [];
  return prisma.organization.findMany({
    where: { id: { in: ids }, type: 'SCHOOL' },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
}

function mergeFilterOptions(
  lists: Array<Awaited<ReturnType<typeof schoolFeesModuleClient.filterOptions>>>
) {
  const years = new Set<string>();
  const terms = new Set<string>();
  const classes = new Set<string>();
  const categories = new Map<string, string>();
  const methods = new Set<string>();
  for (const o of lists) {
    if (!o) continue;
    o.academicYears.forEach((y) => years.add(y));
    o.terms.forEach((t) => terms.add(t));
    o.classes.forEach((c) => classes.add(c));
    o.feeCategories.forEach((c) => categories.set(c.code, c.name));
    o.paymentMethods.forEach((m) => methods.add(m));
  }
  return {
    academicYears: [...years].sort().reverse(),
    terms: [...terms],
    classes: [...classes].sort(),
    feeCategories: [...categories.entries()].map(([code, name]) => ({ code, name })),
    paymentMethods: [...methods],
  };
}

function healthLabel(rate: number): 'on_track' | 'needs_attention' | 'critical' {
  if (rate >= 85) return 'on_track';
  if (rate >= 60) return 'needs_attention';
  return 'critical';
}

export async function getRepresentativeSchoolFeesFilterOptions(
  userId: string,
  organizationId?: string,
  source: FinanceAssignmentSource = 'representative'
) {
  const schools = await assignedSchools(userId, organizationId, source);
  const scoped = organizationId && organizationId !== 'all' ? schools.filter((s) => s.id === organizationId) : schools;
  const [feeOptions, academicSettings] = await Promise.all([
    Promise.all(scoped.map((s) => schoolFeesModuleClient.filterOptions(s.id))),
    Promise.all(scoped.map((s) => academicSettingsService.getForOrganization(s.id))),
  ]);
  const merged = mergeFilterOptions(feeOptions);
  const years = new Set(merged.academicYears);
  const terms = new Set(merged.terms);
  for (const s of academicSettings) {
    s.academicYears.forEach((y) => years.add(y));
    s.terms.forEach((t) => terms.add(t));
  }
  return {
    ...merged,
    academicYears: [...years].sort().reverse(),
    terms: [...terms],
  };
}

export async function getRepresentativeSchoolFeesOverview(
  userId: string,
  query: Record<string, string | undefined>,
  source: FinanceAssignmentSource = 'representative'
) {
  const schools = await assignedSchools(userId, query.organizationId, source);
  if (query.organizationId && query.organizationId !== 'all' && !schools.length) {
    return emptyOverview();
  }

  const perSchool = await Promise.all(
    schools.map(async (school) => {
      const data = await schoolFeesModuleClient.overview(school.id, query);
      if (!data) {
        return {
          organizationId: school.id,
          name: school.name,
          licensed: false,
          expected: 0,
          collected: 0,
          outstanding: 0,
          rate: 0,
          health: 'critical' as const,
          studentsWithOutstanding: 0,
          integrationNote: 'School Fees tenant not provisioned or module unreachable',
        };
      }
      return {
        organizationId: school.id,
        name: school.name,
        licensed: true,
        expected: data.summary.totalExpected,
        collected: data.summary.totalCollected,
        outstanding: data.summary.outstanding,
        rate: data.summary.collectionRate,
        health: data.health,
        studentsWithOutstanding: data.studentsWithOutstanding,
        integrationNote: null as string | null,
        detail: data,
      };
    })
  );

  const licensed = perSchool.filter((s) => s.licensed && s.detail);
  const totalExpected = licensed.reduce((a, s) => a + s.expected, 0);
  const totalCollected = licensed.reduce((a, s) => a + s.collected, 0);
  const outstanding = licensed.reduce((a, s) => a + s.outstanding, 0);
  const rate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 1000) / 10 : 0;

  const categoryMap = new Map<string, { expected: number; collected: number; outstanding: number }>();
  const trendMap = new Map<string, number>();
  const statusTotals = { paid: 0, partial: 0, unpaid: 0, overdue: 0 };

  for (const s of licensed) {
    const d = s.detail!;
    for (const row of d.collectionByCategory) {
      const cur = categoryMap.get(row.category) ?? { expected: 0, collected: 0, outstanding: 0 };
      cur.expected += row.expected;
      cur.collected += row.collected;
      cur.outstanding += row.outstanding;
      categoryMap.set(row.category, cur);
    }
    for (const t of d.collectionTrend) {
      trendMap.set(t.date, (trendMap.get(t.date) ?? 0) + t.amount);
    }
    statusTotals.paid += d.summary.studentStatus.paid;
    statusTotals.partial += d.summary.studentStatus.partial;
    statusTotals.unpaid += d.summary.studentStatus.unpaid;
    statusTotals.overdue += d.summary.studentStatus.overdue;
  }

  return {
    currency: 'RWF',
    metricsSource: licensed.length ? ('school-fees-portal' as const) : ('unavailable' as const),
    summary: {
      totalExpected,
      totalCollected,
      outstanding,
      collectionRate: rate,
      studentStatus: statusTotals,
    },
    collectionProgress: rate,
    bySchool: perSchool.map((s) => ({
      organizationId: s.organizationId,
      name: s.name,
      expected: s.expected,
      collected: s.collected,
      outstanding: s.outstanding,
      rate: s.rate,
      health: s.health,
      studentsWithOutstanding: s.studentsWithOutstanding,
      licensed: s.licensed,
      integrationNote: s.integrationNote,
    })),
    collectionByCategory: [...categoryMap.entries()].map(([category, v]) => ({ category, ...v })),
    collectionTrend: [...trendMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount })),
    statusDistribution: [
      { status: 'Paid', count: statusTotals.paid },
      { status: 'Partial', count: statusTotals.partial },
      { status: 'Unpaid', count: statusTotals.unpaid },
      { status: 'Overdue', count: statusTotals.overdue },
    ],
    health: healthLabel(rate),
    integrationNotes: perSchool.filter((s) => s.integrationNote).map((s) => ({
      schoolName: s.name,
      detail: s.integrationNote!,
    })),
  };
}

function emptyOverview() {
  return {
    currency: 'RWF',
    metricsSource: 'unavailable' as const,
    summary: {
      totalExpected: 0,
      totalCollected: 0,
      outstanding: 0,
      collectionRate: 0,
      studentStatus: { paid: 0, partial: 0, unpaid: 0, overdue: 0 },
    },
    collectionProgress: 0,
    bySchool: [] as Array<{
      organizationId: string;
      name: string;
      expected: number;
      collected: number;
      outstanding: number;
      rate: number;
      health: string;
      studentsWithOutstanding: number;
      licensed: boolean;
      integrationNote: string | null;
    }>,
    collectionByCategory: [],
    collectionTrend: [],
    statusDistribution: [],
    health: 'critical' as const,
    integrationNotes: [],
  };
}

export async function getRepresentativeSchoolFeesTransactions(
  userId: string,
  query: Record<string, string | undefined> & { page?: number; pageSize?: number },
  source: FinanceAssignmentSource = 'representative'
) {
  const schools = await assignedSchools(userId, query.organizationId, source);
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;

  if (query.organizationId && query.organizationId !== 'all') {
    const school = schools[0];
    if (!school) {
      return { page, pageSize, total: 0, totalPages: 1, items: [] };
    }
    const data = await schoolFeesModuleClient.transactions(school.id, { ...query, page, pageSize });
    if (!data) return { page, pageSize, total: 0, totalPages: 1, items: [] };
    return {
      ...data,
      items: data.items.map((i) => ({ ...i, schoolName: school.name })),
    };
  }

  const chunks = await Promise.all(
    schools.map((s) => schoolFeesModuleClient.transactions(s.id, { ...query, page: 1, pageSize: 500 }))
  );
  const merged = chunks.flatMap((chunk, idx) =>
    (chunk?.items ?? []).map((i) => ({ ...i, schoolName: schools[idx]?.name ?? 'School' }))
  );
  merged.sort((a, b) => +new Date(b.paidAt) - +new Date(a.paidAt));
  const total = merged.length;
  const start = (page - 1) * pageSize;
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    items: merged.slice(start, start + pageSize),
  };
}

export async function getRepresentativeSchoolFeesBalances(
  userId: string,
  query: Record<string, string | undefined> & { page?: number; pageSize?: number },
  source: FinanceAssignmentSource = 'representative'
) {
  const schools = await assignedSchools(userId, query.organizationId, source);
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;

  if (query.organizationId && query.organizationId !== 'all') {
    const school = schools[0];
    if (!school) {
      return { page, pageSize, total: 0, totalPages: 1, items: [] };
    }
    const data = await schoolFeesModuleClient.balances(school.id, { ...query, page, pageSize });
    if (!data) return { page, pageSize, total: 0, totalPages: 1, items: [] };
    return {
      ...data,
      items: data.items.map((i) => ({ ...i, schoolName: school.name })),
    };
  }

  const chunks = await Promise.all(
    schools.map((s) => schoolFeesModuleClient.balances(s.id, { ...query, page: 1, pageSize: 500 }))
  );
  const merged = chunks.flatMap((chunk, idx) =>
    (chunk?.items ?? []).map((i) => ({ ...i, schoolName: schools[idx]?.name ?? 'School' }))
  );
  merged.sort((a, b) => b.balance - a.balance);
  const total = merged.length;
  const start = (page - 1) * pageSize;
  const summary = {
    paid: merged.filter((r) => r.status === 'paid').length,
    partial: merged.filter((r) => r.status === 'partial').length,
    unpaid: merged.filter((r) => r.status === 'unpaid').length,
    overdue: merged.filter((r) => r.status === 'overdue').length,
    totalStudents: total,
  };
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    summary,
    items: merged.slice(start, start + pageSize),
  };
}

export async function getRepresentativeSchoolFeesStructures(
  userId: string,
  query: Record<string, string | undefined>,
  source: FinanceAssignmentSource = 'representative'
) {
  const schools = await assignedSchools(userId, query.organizationId, source);
  if (query.organizationId && query.organizationId !== 'all' && !schools.length) {
    return { integrationSource: 'school_fees_portal_and_student_management' as const, items: [] };
  }

  const chunks = await Promise.all(
    schools.map(async (school) => {
      const data = await schoolFeesModuleClient.feeStructures(school.id, query);
      if (!data) return [];
      return data.items.map((item) => ({ ...item, schoolId: school.id, schoolName: school.name }));
    })
  );

  return {
    integrationSource: 'school_fees_portal_and_student_management' as const,
    items: chunks.flat().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  };
}

export async function getRepresentativeSchoolFeesStudentBills(
  userId: string,
  query: Record<string, string | undefined> & { page?: number; pageSize?: number },
  source: FinanceAssignmentSource = 'representative'
) {
  const schools = await assignedSchools(userId, query.organizationId, source);
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;

  if (query.organizationId && query.organizationId !== 'all') {
    const school = schools[0];
    if (!school) {
      return emptyStudentBillsPage(page, pageSize);
    }
    const data = await schoolFeesModuleClient.studentBills(school.id, { ...query, page, pageSize });
    if (!data) return emptyStudentBillsPage(page, pageSize);
    return {
      ...data,
      items: data.items.map((i) => ({ ...i, schoolName: school.name })),
    };
  }

  const chunks = await Promise.all(
    schools.map((s) => schoolFeesModuleClient.studentBills(s.id, { ...query, page: 1, pageSize: 500 }))
  );
  const merged = chunks.flatMap((chunk, idx) =>
    (chunk?.items ?? []).map((i) => ({ ...i, schoolName: schools[idx]?.name ?? 'School' }))
  );
  merged.sort((a, b) => +new Date(b.billedAt) - +new Date(a.billedAt));
  const total = merged.length;
  const start = (page - 1) * pageSize;
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    summary: {
      paid: merged.filter((r) => r.status === 'paid').length,
      partial: merged.filter((r) => r.status === 'partial').length,
      unpaid: merged.filter((r) => r.status === 'unpaid').length,
      overdue: merged.filter((r) => r.status === 'overdue').length,
      totalBills: total,
    },
    items: merged.slice(start, start + pageSize),
  };
}

function emptyStudentBillsPage(page: number, pageSize: number) {
  return {
    page,
    pageSize,
    total: 0,
    totalPages: 1,
    summary: { paid: 0, partial: 0, unpaid: 0, overdue: 0, totalBills: 0 },
    items: [] as Array<Record<string, unknown>>,
  };
}

function emptyClassAnalytics(): SchoolFeesClassAnalytics {
  return {
    currency: 'RWF',
    metricsSource: 'unavailable',
    summary: {
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
    },
    byClass: [],
    chartStatusByClass: [],
    chartCollectionByClass: [],
    integrationNotes: [],
  };
}

export async function getRepresentativeSchoolFeesAnalytics(
  userId: string,
  query: Record<string, string | undefined>,
  source: FinanceAssignmentSource = 'representative'
) {
  const schools = await assignedSchools(userId, query.organizationId, source);
  if (query.organizationId && query.organizationId !== 'all' && !schools.length) {
    return emptyClassAnalytics();
  }

  const multiSchool = !(query.organizationId && query.organizationId !== 'all') && schools.length > 1;

  const results = await Promise.all(
    schools.map(async (school) => ({
      school,
      data: await schoolFeesModuleClient.classAnalytics(school.id, query),
    }))
  );

  const integrationNotes: Array<{ schoolName: string; detail: string }> = [];
  const byClass: SchoolFeesClassAnalytics['byClass'] = [];
  let metricsSource: SchoolFeesClassAnalytics['metricsSource'] = 'empty';

  for (const { school, data } of results) {
    if (!data) {
      integrationNotes.push({
        schoolName: school.name,
        detail: 'School Fees tenant not provisioned or module unreachable',
      });
      continue;
    }
    if (data.metricsSource === 'school-fees-portal') metricsSource = 'school-fees-portal';
    for (const row of data.byClass) {
      byClass.push({
        ...row,
        className: multiSchool ? `${row.className} · ${school.name}` : row.className,
        organizationId: school.id,
        schoolName: school.name,
      });
    }
  }

  if (integrationNotes.length === schools.length) {
    return { ...emptyClassAnalytics(), integrationNotes };
  }

  byClass.sort((a, b) => a.className.localeCompare(b.className));

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
      acc.overdueAmount += (r as { overdueAmount?: number }).overdueAmount ?? 0;
      acc.exempted += (r as { exempted?: number }).exempted ?? 0;
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
    metricsSource,
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
    integrationNotes: integrationNotes.length ? integrationNotes : undefined,
  };
}
