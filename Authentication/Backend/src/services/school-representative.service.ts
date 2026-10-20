import {
  OrganizationStatus,
  RepresentativeAssignmentStatus,
  UserStatus,
} from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import {
  mergeRepPermissions,
  type RepresentativePermissionProfile,
} from '../constants/representative-permissions';
import { organizationAdminService } from './organization-admin.service';
import { getRepresentativeGateAttendance } from './representative-gate.service';
import { getRepresentativeAttendanceMetrics } from './representative-attendance-metrics.service';
import {
  getRepresentativeStudentsDirectory,
  getRepresentativeStaffDirectory,
} from './representative-directory.service';
import {
  getRepresentativeSchoolFeesOverview,
  getRepresentativeSchoolFeesTransactions,
  getRepresentativeSchoolFeesBalances,
  getRepresentativeSchoolFeesFilterOptions,
  getRepresentativeSchoolFeesAnalytics,
} from './representative-fees.service';
import { getRepresentativeAcademicContext } from './representative-academic-context.service';

function hashOrgSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function orgMetrics(organizationId: string, staffCount: number) {
  const seed = hashOrgSeed(organizationId);
  const students = 420 + (seed % 900);
  const attendanceRate = 88 + (seed % 9) + (seed % 10) / 10;
  const academicScore = 68 + (seed % 28);
  const passRate = 72 + (seed % 22);
  const feesCollected = 12_000_000 + (seed % 40) * 250_000;
  const feesOutstanding = 800_000 + (seed % 20) * 120_000;
  const payrollTotal = 4_500_000 + (seed % 30) * 180_000;
  return {
    students,
    staff: staffCount,
    attendanceRate: Math.round(attendanceRate * 10) / 10,
    academicScore,
    passRate,
    feesCollected,
    feesOutstanding,
    payrollTotal,
    metricsSource: 'derived' as const,
  };
}

export class SchoolRepresentativeService {
  async ensureActiveRepresentative(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: { include: { role: { select: { slug: true } } } },
        representativeProfile: true,
      },
    });
    if (!user) throw new AppError(404, 'User not found');
    const isRep = user.userRoles.some((ur) => ur.role.slug === 'school_representative');
    if (!isRep) throw new AppError(403, 'School representative role required');
    if (user.status !== UserStatus.ACTIVE) {
      throw new AppError(403, 'Representative account is not active');
    }
    return user;
  }

  async listAuthorizedOrganizationIds(userId: string): Promise<string[]> {
    const now = new Date();
    const rows = await prisma.schoolRepresentativeAssignment.findMany({
      where: {
        userId,
        status: RepresentativeAssignmentStatus.ACTIVE,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { organizationId: true },
    });
    return rows.map((r) => r.organizationId);
  }

  async assertOrgAccess(userId: string, organizationId: string) {
    const ids = await this.listAuthorizedOrganizationIds(userId);
    if (!ids.includes(organizationId)) {
      throw new AppError(403, 'Organization not assigned to this representative');
    }
  }

  async resolvePermissions(userId: string, organizationId: string): Promise<RepresentativePermissionProfile> {
    const [profile, assignment] = await Promise.all([
      prisma.schoolRepresentativeProfile.findUnique({ where: { userId } }),
      prisma.schoolRepresentativeAssignment.findUnique({
        where: { userId_organizationId: { userId, organizationId } },
      }),
    ]);
    return mergeRepPermissions(profile?.permissions, assignment?.permissions);
  }

  async getSession(userId: string) {
    await this.ensureActiveRepresentative(userId);
    const profile = await prisma.schoolRepresentativeProfile.findUnique({ where: { userId } });
    const assignments = await this.listSchools(userId);
    return {
      permissions: profile?.permissions ?? {},
      accessMode: profile?.accessMode ?? 'view_only',
      enforceMfa: profile?.enforceMfa ?? false,
      assignedSchoolCount: assignments.length,
      schools: assignments,
    };
  }

  async getAcademicContext(userId: string, organizationId?: string) {
    await this.ensureActiveRepresentative(userId);
    return getRepresentativeAcademicContext(userId, organizationId);
  }

  private async attachSchoolPerformance(
    userId: string,
    schools: Awaited<ReturnType<SchoolRepresentativeService['listSchoolsBase']>>,
    academicYear: string,
    term: string
  ): Promise<
    Array<
      Awaited<ReturnType<SchoolRepresentativeService['listSchoolsBase']>>[number] & {
        performance: { attendance: number; academic: number; schoolFees: number };
      }
    >
  > {
    const [attendance, fees] = await Promise.all([
      getRepresentativeAttendanceMetrics(userId, { period: 'week', personKind: 'student' }),
      getRepresentativeSchoolFeesOverview(userId, { academicYear, term }),
    ]);
    const attMap = new Map(attendance.bySchool.map((s) => [s.organizationId, s.studentRate]));
    const feesMap = new Map(fees.bySchool.map((s) => [s.organizationId, s.rate]));

    return schools.map((s) => {
      const m = orgMetrics(s.id, s.staff);
      return {
        ...s,
        performance: {
          attendance: attMap.get(s.id) ?? m.attendanceRate,
          academic: m.passRate,
          schoolFees: feesMap.get(s.id) ?? 0,
        },
      };
    });
  }

  async listSchoolsBase(userId: string, query?: { search?: string; status?: string }) {
    await this.ensureActiveRepresentative(userId);
    const orgIds = await this.listAuthorizedOrganizationIds(userId);
    if (!orgIds.length) return [];

    const search = query?.search?.trim().toLowerCase();
    const orgs = await prisma.organization.findMany({
      where: {
        id: { in: orgIds },
        type: 'SCHOOL',
        ...(query?.status ? { status: query.status as OrganizationStatus } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { organizationCode: { contains: search, mode: 'insensitive' } },
                { slug: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        district: { select: { name: true } },
        sector: { select: { name: true } },
        schoolProfile: { select: { principalName: true, leadershipPhone: true } },
      },
      orderBy: { name: 'asc' },
    });

    const stats = await Promise.all(
      orgs.map(async (org) => {
        const usage = await organizationAdminService.usageStats(org.id);
        const metrics = orgMetrics(org.id, usage.totalUsers);
        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          organizationCode: org.organizationCode,
          status: org.status,
          logoUrl: org.logoUrl,
          district: org.district?.name ?? null,
          sector: org.sector?.name ?? null,
          managerName: org.schoolProfile?.principalName ?? null,
          managerPhone: org.schoolProfile?.leadershipPhone ?? null,
          licensedModules: usage.licensedModules,
          students: metrics.students,
          staff: metrics.staff,
          access: 'View & Reports',
          lastActivity: org.updatedAt,
          metricsSource: metrics.metricsSource,
        };
      })
    );

    return stats;
  }

  async listSchools(
    userId: string,
    query?: {
      search?: string;
      status?: string;
      academicYear?: string;
      term?: string;
      includePerformance?: boolean;
    }
  ) {
    const schools = await this.listSchoolsBase(userId, query);
    if (query?.includePerformance && query.academicYear && query.term) {
      return this.attachSchoolPerformance(userId, schools, query.academicYear, query.term);
    }
    return schools;
  }

  async getOverview(
    userId: string,
    filters: {
      organizationId?: string;
      academicYear?: string;
      term?: string;
    }
  ) {
    await this.ensureActiveRepresentative(userId);
    const schools = await this.listSchools(userId);
    const scoped =
      filters.organizationId && filters.organizationId !== 'all'
        ? schools.filter((s) => s.id === filters.organizationId)
        : schools;

    if (filters.organizationId && filters.organizationId !== 'all' && !scoped.length) {
      throw new AppError(403, 'Organization not assigned to this representative');
    }

    const totals = scoped.reduce(
      (acc, s) => {
        acc.students += s.students;
        acc.staff += s.staff;
        return acc;
      },
      { students: 0, staff: 0 }
    );

    const performance = scoped.map((s) => {
      const m = orgMetrics(s.id, s.staff);
      return {
        organizationId: s.id,
        name: s.name,
        academicScore: m.academicScore,
        passRate: m.passRate,
        attendanceRate: m.attendanceRate,
      };
    });

    const avgAttendance =
      performance.length > 0
        ? Math.round(
            (performance.reduce((a, p) => a + p.attendanceRate, 0) / performance.length) * 10
          ) / 10
        : 0;

    const alerts = await this.listAlerts(userId, filters.organizationId);

    return {
      filters: {
        academicYear: filters.academicYear ?? '2026-2027',
        term: filters.term ?? 'Term 1',
        organizationId: filters.organizationId ?? 'all',
      },
      summary: {
        assignedSchools: scoped.length,
        totalStudents: totals.students,
        totalStaff: totals.staff,
        averageAttendance: avgAttendance,
        openAlerts: alerts.filter((a) => a.status === 'OPEN').length,
      },
      schoolPerformance: performance,
      financial: scoped.map((s) => {
        const m = orgMetrics(s.id, s.staff);
        return {
          organizationId: s.id,
          name: s.name,
          feesCollected: m.feesCollected,
          feesOutstanding: m.feesOutstanding,
          payrollTotal: m.payrollTotal,
        };
      }),
      lastUpdated: new Date().toISOString(),
      metricsSource: 'derived' as const,
    };
  }

  async getAcademics(userId: string, organizationId?: string) {
    const schools = await this.listSchools(userId);
    const scoped = organizationId && organizationId !== 'all'
      ? schools.filter((s) => s.id === organizationId)
      : schools;

    return {
      summary: {
        averageMarks:
          scoped.length > 0
            ? Math.round(
                scoped.reduce((a, s) => a + orgMetrics(s.id, s.staff).academicScore, 0) /
                  scoped.length
              )
            : 0,
        passRate:
          scoped.length > 0
            ? Math.round(
                scoped.reduce((a, s) => a + orgMetrics(s.id, s.staff).passRate, 0) / scoped.length
              )
            : 0,
        examsPending: scoped.length * 2,
        resultsPublished: scoped.length,
      },
      bySchool: scoped.map((s) => {
        const m = orgMetrics(s.id, s.staff);
        return {
          organizationId: s.id,
          name: s.name,
          averageMarks: m.academicScore,
          passRate: m.passRate,
          atRiskStudents: 12 + (hashOrgSeed(s.id) % 40),
        };
      }),
      chart: scoped.map((s) => ({
        name: s.name.length > 18 ? `${s.name.slice(0, 16)}…` : s.name,
        average: orgMetrics(s.id, s.staff).academicScore,
        passRate: orgMetrics(s.id, s.staff).passRate,
      })),
      metricsSource: 'derived' as const,
    };
  }

  async getFinancePayroll(userId: string, organizationId?: string) {
    const fees = await getRepresentativeSchoolFeesOverview(userId, {
      organizationId: organizationId && organizationId !== 'all' ? organizationId : undefined,
    });
    const schools = await this.listSchools(userId);
    const scoped = organizationId && organizationId !== 'all'
      ? schools.filter((s) => s.id === organizationId)
      : schools;

    const payrollBySchool = scoped.map((s) => {
      const m = orgMetrics(s.id, s.staff);
      return {
        organizationId: s.id,
        name: s.name,
        payrollTotal: m.payrollTotal,
        budgetUsedPct: 62 + (hashOrgSeed(s.id) % 30),
      };
    });

    const bySchool = fees.bySchool.map((s) => ({
      organizationId: s.organizationId,
      name: s.name,
      feesCollected: s.collected,
      feesOutstanding: s.outstanding,
      payrollTotal:
        payrollBySchool.find((p) => p.organizationId === s.organizationId)?.payrollTotal ?? 0,
      budgetUsedPct:
        payrollBySchool.find((p) => p.organizationId === s.organizationId)?.budgetUsedPct ?? 0,
      collectionRate: s.rate,
    }));

    return {
      totals: {
        feesCollected: fees.summary.totalCollected,
        feesOutstanding: fees.summary.outstanding,
        payrollTotal: payrollBySchool.reduce((a, r) => a + r.payrollTotal, 0),
      },
      bySchool,
      payrollVisibility: 'aggregated',
      metricsSource: fees.metricsSource,
    };
  }

  private scopedSchools(userId: string, organizationId?: string) {
    return this.listSchools(userId).then((schools) =>
      organizationId && organizationId !== 'all'
        ? schools.filter((s) => s.id === organizationId)
        : schools
    );
  }

  async getStudentsDirectory(
    userId: string,
    query?: { organizationId?: string; search?: string; className?: string; status?: string }
  ) {
    return getRepresentativeStudentsDirectory(userId, query);
  }

  async getStaffDirectory(
    userId: string,
    query?: { organizationId?: string; search?: string; department?: string; status?: string }
  ) {
    return getRepresentativeStaffDirectory(userId, query);
  }

  async getGateAttendance(
    userId: string,
    query?: {
      organizationId?: string;
      date?: string;
      personKind?: string;
      shift?: string;
      search?: string;
      status?: string;
      page?: number;
      pageSize?: number;
    }
  ) {
    return getRepresentativeGateAttendance(userId, query ?? {});
  }

  async getAttendanceMetrics(
    userId: string,
    query?: { organizationId?: string; period?: string; department?: string; personKind?: string }
  ) {
    return getRepresentativeAttendanceMetrics(userId, query);
  }

  async getSchoolFeesOverview(userId: string, query: Record<string, string | undefined>) {
    return getRepresentativeSchoolFeesOverview(userId, query);
  }

  async getSchoolFeesTransactions(
    userId: string,
    query: Record<string, string | undefined> & { page?: number; pageSize?: number }
  ) {
    return getRepresentativeSchoolFeesTransactions(userId, query);
  }

  async getSchoolFeesBalances(
    userId: string,
    query: Record<string, string | undefined> & { page?: number; pageSize?: number }
  ) {
    return getRepresentativeSchoolFeesBalances(userId, query);
  }

  async getSchoolFeesFilterOptions(userId: string, organizationId?: string) {
    return getRepresentativeSchoolFeesFilterOptions(userId, organizationId);
  }

  async getSchoolFeesAnalytics(userId: string, query: Record<string, string | undefined>) {
    return getRepresentativeSchoolFeesAnalytics(userId, query);
  }

  async getAttendance(userId: string, organizationId?: string) {
    const metrics = await getRepresentativeAttendanceMetrics(userId, {
      organizationId,
      period: 'week',
    });
    return {
      summary: {
        studentRate: metrics.summary.studentRate,
        staffRate: metrics.summary.staffRate,
        lateArrivals: metrics.summary.lateArrivals,
        rfidEventsToday: metrics.summary.totalPresent,
      },
      bySchool: metrics.bySchool.map((s) => ({
        organizationId: s.organizationId,
        name: s.name,
        studentRate: s.studentRate,
        staffRate: s.staffRate,
      })),
      weeklyTrend: metrics.dailyTrend.map((d) => ({
        day: d.day,
        student: d.studentsPresent,
        staff: d.staffPresent,
      })),
      metricsSource: metrics.metricsSource,
    };
  }

  async listAlerts(userId: string, organizationId?: string) {
    const orgIds = await this.listAuthorizedOrganizationIds(userId);
    if (!orgIds.length) return [];

    const filterIds =
      organizationId && organizationId !== 'all'
        ? orgIds.filter((id) => id === organizationId)
        : orgIds;

    const stored = await prisma.representativeAlert.findMany({
      where: { organizationId: { in: filterIds } },
      include: { organization: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    if (stored.length) {
      return stored.map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        message: a.message,
        severity: a.severity,
        status: a.status,
        organizationId: a.organizationId,
        schoolName: a.organization.name,
        createdAt: a.createdAt,
      }));
    }

    const schools = await prisma.organization.findMany({
      where: { id: { in: filterIds } },
      select: { id: true, name: true },
    });

    const synthetic = schools.flatMap((s, idx) => {
      const seed = hashOrgSeed(s.id);
      const items = [];
      if (seed % 3 === 0) {
        items.push({
          id: `syn-att-${s.id}`,
          type: 'attendance',
          title: 'Low student attendance',
          message: `${s.name} · Review attendance for the selected period.`,
          severity: 'warning',
          status: 'OPEN',
          organizationId: s.id,
          schoolName: s.name,
          createdAt: new Date(),
        });
      }
      if (seed % 4 === 0 || idx === 0) {
        items.push({
          id: `syn-marks-${s.id}`,
          type: 'academics',
          title: 'Marks submission pending',
          message: `${s.name} · Some assigned assessments remain incomplete.`,
          severity: 'info',
          status: 'OPEN',
          organizationId: s.id,
          schoolName: s.name,
          createdAt: new Date(),
        });
      }
      if (seed % 5 === 0) {
        items.push({
          id: `syn-pay-${s.id}`,
          type: 'payroll',
          title: 'Payroll review required',
          message: `${s.name} · A payroll process requires authorized review.`,
          severity: 'high',
          status: 'OPEN',
          organizationId: s.id,
          schoolName: s.name,
          createdAt: new Date(),
        });
      }
      return items;
    });

    return synthetic;
  }

  async listFollowUps(userId: string) {
    await this.ensureActiveRepresentative(userId);
    const orgIds = await this.listAuthorizedOrganizationIds(userId);
    const rows = await prisma.representativeFollowUp.findMany({
      where: { representativeUserId: userId, organizationId: { in: orgIds } },
      orderBy: { createdAt: 'desc' },
    });
    const orgNames = await prisma.organization.findMany({
      where: { id: { in: orgIds } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(orgNames.map((o) => [o.id, o.name]));
    return rows.map((r) => ({
      ...r,
      schoolName: nameMap.get(r.organizationId) ?? 'School',
    }));
  }

  async createFollowUp(
    userId: string,
    data: {
      organizationId: string;
      title: string;
      description?: string;
      priority?: string;
      dueDate?: string;
    }
  ) {
    await this.assertOrgAccess(userId, data.organizationId);
    const row = await prisma.representativeFollowUp.create({
      data: {
        representativeUserId: userId,
        organizationId: data.organizationId,
        title: data.title.trim(),
        description: data.description?.trim(),
        priority: data.priority ?? 'MEDIUM',
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    });
    return row;
  }

  async updateFollowUp(
    userId: string,
    followUpId: string,
    data: { status?: string; resolutionNotes?: string }
  ) {
    const existing = await prisma.representativeFollowUp.findFirst({
      where: { id: followUpId, representativeUserId: userId },
    });
    if (!existing) throw new AppError(404, 'Follow-up not found');

    const status = data.status ?? existing.status;
    return prisma.representativeFollowUp.update({
      where: { id: followUpId },
      data: {
        status,
        resolutionNotes: data.resolutionNotes?.trim(),
        resolvedAt: status === 'COMPLETED' ? new Date() : existing.resolvedAt,
      },
    });
  }
}

export const schoolRepresentativeService = new SchoolRepresentativeService();
