import {
  OrganizationStatus,
  RepresentativeAssignmentStatus,
  UserStatus,
} from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { ROLES } from '../constants/roles';
import {
  mergeChiefAccountantPermissions,
  type ChiefAccountantPermissionProfile,
} from '../constants/chief-accountant-permissions';
import { organizationAdminService } from './organization-admin.service';
import { getRepresentativeAcademicContext } from './representative-academic-context.service';
import {
  getRepresentativeSchoolFeesAnalytics,
  getRepresentativeSchoolFeesBalances,
  getRepresentativeSchoolFeesFilterOptions,
  getRepresentativeSchoolFeesOverview,
  getRepresentativeSchoolFeesTransactions,
  getRepresentativeSchoolFeesStructures,
  getRepresentativeSchoolFeesStudentBills,
} from './representative-fees.service';

const FINANCE_SOURCE = 'chief' as const;

export class ChiefAccountantService {
  async ensureActiveChiefAccountant(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: { include: { role: { select: { slug: true } } } },
        chiefAccountantProfile: true,
      },
    });
    if (!user) throw new AppError(404, 'User not found');
    const isChief = user.userRoles.some((ur) => ur.role.slug === ROLES.CHIEF_ACCOUNTANT);
    if (!isChief) throw new AppError(403, 'Chief accountant role required');
    if (user.status !== UserStatus.ACTIVE) {
      throw new AppError(403, 'Chief accountant account is not active');
    }
    return user;
  }

  async listAuthorizedOrganizationIds(userId: string): Promise<string[]> {
    const now = new Date();
    const rows = await prisma.chiefAccountantAssignment.findMany({
      where: {
        userId,
        status: RepresentativeAssignmentStatus.ACTIVE,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { organizationId: true },
    });
    return rows.map((r) => r.organizationId);
  }

  async resolvePermissions(
    userId: string,
    organizationId: string
  ): Promise<ChiefAccountantPermissionProfile> {
    const [profile, assignment] = await Promise.all([
      prisma.chiefAccountantProfile.findUnique({ where: { userId } }),
      prisma.chiefAccountantAssignment.findUnique({
        where: { userId_organizationId: { userId, organizationId } },
      }),
    ]);
    return mergeChiefAccountantPermissions(profile?.permissions, assignment?.permissions);
  }

  async getSession(userId: string) {
    await this.ensureActiveChiefAccountant(userId);
    const profile = await prisma.chiefAccountantProfile.findUnique({ where: { userId } });
    const organizations = await this.listOrganizations(userId);
    return {
      permissions: profile?.permissions ?? {},
      accessLevel: profile?.accessLevel ?? 'prepare',
      approvalLimit: profile?.approvalLimit ? Number(profile.approvalLimit) : null,
      enforceMfa: profile?.enforceMfa ?? false,
      assignedOrganizationCount: organizations.length,
      organizations,
    };
  }

  async listOrganizations(userId: string, query?: { search?: string }) {
    await this.ensureActiveChiefAccountant(userId);
    const orgIds = await this.listAuthorizedOrganizationIds(userId);
    if (!orgIds.length) return [];

    const search = query?.search?.trim().toLowerCase();
    const orgs = await prisma.organization.findMany({
      where: {
        id: { in: orgIds },
        type: 'SCHOOL',
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { organizationCode: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        district: { select: { name: true } },
        schoolProfile: { select: { academicYear: true } },
      },
      orderBy: { name: 'asc' },
    });

    return Promise.all(
      orgs.map(async (org) => {
        const usage = await organizationAdminService.usageStats(org.id);
        return {
          id: org.id,
          name: org.name,
          organizationCode: org.organizationCode,
          status: org.status,
          logoUrl: org.logoUrl,
          district: org.district?.name ?? null,
          financialYear: org.schoolProfile?.academicYear ?? null,
          students: usage.totalUsers,
          access: 'Full assigned finance operations',
        };
      })
    );
  }

  async getAcademicContext(userId: string, organizationId?: string) {
    await this.ensureActiveChiefAccountant(userId);
    return getRepresentativeAcademicContext(userId, organizationId, 'chief');
  }

  async getOverview(
    userId: string,
    filters: {
      organizationId?: string;
      academicYear?: string;
      term?: string;
      financialPeriod?: string;
    }
  ) {
    await this.ensureActiveChiefAccountant(userId);
    const fees = await getRepresentativeSchoolFeesOverview(
      userId,
      {
        organizationId: filters.organizationId,
        academicYear: filters.academicYear,
        term: filters.term,
      },
      FINANCE_SOURCE
    );

    const revenueRecognized = fees.summary.totalCollected;
    const feesOutstanding = fees.summary.outstanding;
    const totalExpenses = 0;
    const cashPosition = revenueRecognized - totalExpenses;
    const pendingApprovals = 0;

    return {
      currency: 'RWF',
      accountingRules: {
        revenueBasis: 'collected_fees_only',
        cashBasis: 'reconciled_collections_minus_posted_expenses',
        note: 'Invoiced fees and unverified payments are excluded from revenue and cash position.',
      },
      summary: {
        totalRevenue: revenueRecognized,
        totalExpenses,
        cashPosition,
        pendingApprovals,
        feesOutstanding,
        payrollExpenditure: 0,
        budgetUtilizationPct: null as number | null,
        unreconciledTransactions: 0,
      },
      performance: {
        revenue: revenueRecognized,
        expenses: totalExpenses,
        netPosition: cashPosition,
      },
      collectionTrend: fees.collectionTrend ?? [],
      bySchool: (fees.bySchool ?? []).map((s) => ({
        organizationId: s.organizationId,
        name: s.name,
        revenue: s.collected,
        expenses: 0,
        outstandingFees: s.outstanding,
        collectionRate: s.rate,
      })),
      recentActivity: [] as Array<{ id: string; label: string; at: string; organizationName: string }>,
      alerts: [] as Array<{ id: string; title: string; severity: string }>,
      feesDetail: fees,
    };
  }

  getSchoolFeesOverview(userId: string, query: Record<string, string | undefined>) {
    return getRepresentativeSchoolFeesOverview(userId, query, FINANCE_SOURCE);
  }

  getSchoolFeesAnalytics(userId: string, query: Record<string, string | undefined>) {
    return getRepresentativeSchoolFeesAnalytics(userId, query, FINANCE_SOURCE);
  }

  getSchoolFeesFilterOptions(userId: string, organizationId?: string) {
    return getRepresentativeSchoolFeesFilterOptions(userId, organizationId, FINANCE_SOURCE);
  }

  getSchoolFeesTransactions(
    userId: string,
    query: Record<string, string | undefined> & { page?: number; pageSize?: number }
  ) {
    return getRepresentativeSchoolFeesTransactions(userId, query, FINANCE_SOURCE);
  }

  getSchoolFeesBalances(
    userId: string,
    query: Record<string, string | undefined> & { page?: number; pageSize?: number }
  ) {
    return getRepresentativeSchoolFeesBalances(userId, query, FINANCE_SOURCE);
  }

  getSchoolFeesStructures(userId: string, query: Record<string, string | undefined>) {
    return getRepresentativeSchoolFeesStructures(userId, query, FINANCE_SOURCE);
  }

  getSchoolFeesStudentBills(
    userId: string,
    query: Record<string, string | undefined> & { page?: number; pageSize?: number }
  ) {
    return getRepresentativeSchoolFeesStudentBills(userId, query, FINANCE_SOURCE);
  }

  async getSchoolFeesDashboard(userId: string, query: Record<string, string | undefined>) {
    await this.ensureActiveChiefAccountant(userId);
    const [fees, analytics, transactions, structures] = await Promise.all([
      getRepresentativeSchoolFeesOverview(userId, query, FINANCE_SOURCE),
      getRepresentativeSchoolFeesAnalytics(userId, query, FINANCE_SOURCE),
      getRepresentativeSchoolFeesTransactions(
        userId,
        { ...query, page: 1, pageSize: 8 } as Record<string, string | undefined> & {
          page?: number;
          pageSize?: number;
        },
        FINANCE_SOURCE
      ),
      getRepresentativeSchoolFeesStructures(userId, query, FINANCE_SOURCE),
    ]);

    const studentStatus = fees.summary?.studentStatus ?? {
      paid: analytics.summary?.paid ?? 0,
      partial: analytics.summary?.partial ?? 0,
      unpaid: analytics.summary?.unpaid ?? 0,
      overdue: analytics.summary?.overdue ?? 0,
    };

    const alerts: Array<{ id: string; title: string; severity: 'info' | 'warning' | 'critical' }> = [];
    if ((fees.summary?.outstanding ?? 0) > 0 && (fees.summary?.collectionRate ?? 100) < 70) {
      alerts.push({ id: 'high-outstanding', title: 'High outstanding fees for selected scope', severity: 'warning' });
    }
    if ((analytics.summary?.overdue ?? 0) > 0) {
      alerts.push({
        id: 'overdue-students',
        title: `${analytics.summary.overdue} student bill(s) overdue`,
        severity: 'critical',
      });
    }
    if (!structures.items?.length) {
      alerts.push({
        id: 'no-structures',
        title: 'No fee structure configured for the selected term',
        severity: 'info',
      });
    }
    if (fees.metricsSource === 'unavailable') {
      alerts.push({
        id: 'fees-unavailable',
        title: 'School Fees tenant not provisioned for one or more schools',
        severity: 'warning',
      });
    }

    return {
      currency: 'RWF',
      summary: {
        expectedFees: fees.summary?.totalExpected ?? 0,
        paidFees: fees.summary?.totalCollected ?? 0,
        outstandingFees: fees.summary?.outstanding ?? 0,
        overdueFees: analytics.summary?.overdueAmount ?? 0,
        collectionRate: fees.summary?.collectionRate ?? 0,
        unreconciledAmount: 0,
        studentCounts: {
          paid: studentStatus.paid ?? analytics.summary?.paid ?? 0,
          partial: studentStatus.partial ?? analytics.summary?.partial ?? 0,
          unpaid: studentStatus.unpaid ?? analytics.summary?.unpaid ?? 0,
          overdue: studentStatus.overdue ?? analytics.summary?.overdue ?? 0,
          exempted: analytics.summary?.exempted ?? 0,
        },
      },
      collectionTrend: fees.collectionTrend ?? [],
      bySchool: (fees.bySchool ?? []).map((s) => ({
        organizationId: s.organizationId,
        name: s.name,
        expected: s.expected,
        paid: s.collected,
        outstanding: s.outstanding,
        collectionRate: s.rate,
      })),
      statusDistribution: [
        { status: 'Fully paid', count: studentStatus.paid ?? 0, fill: '#22c55e' },
        { status: 'Partial', count: studentStatus.partial ?? 0, fill: '#f59e0b' },
        { status: 'Unpaid', count: studentStatus.unpaid ?? 0, fill: '#94a3b8' },
        { status: 'Overdue', count: studentStatus.overdue ?? 0, fill: '#ef4444' },
        { status: 'Exempted', count: analytics.summary?.exempted ?? 0, fill: '#6366f1' },
      ],
      recentPayments: (transactions.items ?? []).map((t) => ({
        id: t.id,
        receiptNumber: t.receiptNumber ?? t.paymentNumber,
        studentName: t.studentName,
        schoolName: t.schoolName,
        amount: t.amount,
        paidAt: t.paidAt,
        status: t.status,
        method: t.method,
      })),
      pendingActions: [] as Array<{ id: string; label: string; kind: string }>,
      alerts,
      integrationSource: {
        studentManagement: true,
        schoolFeesPortal: fees.metricsSource === 'school-fees-portal',
      },
    };
  }
}

export const chiefAccountantService = new ChiefAccountantService();
