import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';

const APPROVED_STATUSES = [
  'DEPARTMENT_HEAD_APPROVED',
  'FINANCE_APPROVED',
  'PROCUREMENT_APPROVED',
  'MD_APPROVED',
  'CONVERTED_TO_PO',
];

export interface AnalyticsFilters {
  academicYear?: string;
  term?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  categoryId?: string;
  departmentId?: string;
  requesterId?: string;
}

function buildPrWhere(
  organizationId: string,
  filters: AnalyticsFilters,
): Prisma.PurchaseRequestWhereInput {
  const where: Prisma.PurchaseRequestWhereInput = { organizationId };

  if (filters.academicYear) where.academicYear = filters.academicYear;
  if (filters.term) where.term = filters.term;
  if (filters.departmentId) where.departmentId = filters.departmentId;
  if (filters.status && filters.status !== 'ALL') where.status = filters.status as any;
  if (filters.requesterId) where.requestedBy = filters.requesterId;

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      const end = new Date(filters.dateTo);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  if (filters.categoryId) {
    where.items = { some: { categoryId: filters.categoryId } };
  }

  return where;
}

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function sumPrValue(prs: { totalEstimate: Prisma.Decimal | null; items?: { estimatedTotal: Prisma.Decimal }[] }[]): number {
  return prs.reduce((acc, pr) => {
    const val = pr.totalEstimate != null
      ? Number(pr.totalEstimate)
      : (pr.items ?? []).reduce((s, i) => s + Number(i.estimatedTotal), 0);
    return acc + val;
  }, 0);
}

function isApproved(status: string): boolean {
  return APPROVED_STATUSES.includes(status);
}

function isRejected(status: string): boolean {
  return status === 'REJECTED';
}

function isPending(status: string): boolean {
  return status === 'PENDING' || status === 'DRAFT';
}

export class AnalyticsService {
  async getProcurementAnalytics(organizationId: string, filters: AnalyticsFilters) {
    const where = buildPrWhere(organizationId, filters);

    const prs = await prisma.purchaseRequest.findMany({
      where,
      include: {
        items: { include: { category: true } },
        department: true,
        purchaseOrders: { include: { items: true } },
      },
    });

    const pos = await prisma.purchaseOrder.findMany({
      where: {
        organizationId,
        ...(filters.dateFrom || filters.dateTo
          ? {
              createdAt: {
                ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
                ...(filters.dateTo
                  ? { lte: new Date(new Date(filters.dateTo).setHours(23, 59, 59, 999)) }
                  : {}),
              },
            }
          : {}),
      },
      include: { purchaseRequest: true, items: true },
    });

    const linkedPos = filters.academicYear || filters.term || filters.departmentId
      ? pos.filter((po) => {
          const pr = po.purchaseRequest;
          if (!pr) return false;
          if (filters.academicYear && pr.academicYear !== filters.academicYear) return false;
          if (filters.term && pr.term !== filters.term) return false;
          if (filters.departmentId && pr.departmentId !== filters.departmentId) return false;
          return true;
        })
      : pos;

    const totalRequests = prs.length;
    const requestedValue = sumPrValue(prs);
    const approvedPrs = prs.filter((p) => isApproved(p.status));
    const approvedValue = sumPrValue(approvedPrs);
    const purchasedValue = linkedPos.reduce((s, po) => s + Number(po.totalAmount), 0);
    const pendingPrs = prs.filter((p) => isPending(p.status));
    const pendingValue = sumPrValue(pendingPrs);
    const rejectedPrs = prs.filter((p) => isRejected(p.status));
    const rejectedValue = sumPrValue(rejectedPrs);
    const avgRequest = totalRequests > 0 ? requestedValue / totalRequests : 0;
    const completedCount = prs.filter((p) => p.status === 'CONVERTED_TO_PO').length;
    const completionRate = totalRequests > 0 ? Math.round((completedCount / totalRequests) * 100) : 0;

    const pipeline = {
      submitted: totalRequests,
      underReview: prs.filter((p) => p.status === 'PENDING').length,
      approved: approvedPrs.length,
      ordered: linkedPos.length,
      received: linkedPos.filter((po) =>
        ['DELIVERED', 'PARTIALLY_DELIVERED', 'COMPLETED'].includes(po.status),
      ).length,
      completed: linkedPos.filter((po) => po.status === 'COMPLETED').length,
    };

    const categoryMap = new Map<string, number>();
    for (const pr of prs) {
      for (const item of pr.items) {
        const cat = item.category?.name ?? 'Other';
        categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + Number(item.estimatedTotal));
      }
    }
    const categoryTotal = [...categoryMap.values()].reduce((a, b) => a + b, 0) || 1;
    const byCategory = [...categoryMap.entries()]
      .map(([category, total]) => ({
        category,
        total,
        percentage: Math.round((total / categoryTotal) * 100),
      }))
      .sort((a, b) => b.total - a.total);

    const deptMap = new Map<string, number>();
    for (const pr of prs) {
      const name = pr.departmentOther?.trim() || pr.department?.name || 'Unknown';
      deptMap.set(name, (deptMap.get(name) ?? 0) + (Number(pr.totalEstimate) || sumPrValue([pr])));
    }
    const byDepartment = [...deptMap.entries()]
      .map(([department, total]) => ({ department, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const itemMap = new Map<
      string,
      { requests: number; quantity: number; requested: number; approved: number; purchased: number }
    >();
    for (const pr of prs) {
      const approved = isApproved(pr.status);
      for (const item of pr.items) {
        const key = item.itemName;
        const cur = itemMap.get(key) ?? {
          requests: 0,
          quantity: 0,
          requested: 0,
          approved: 0,
          purchased: 0,
        };
        cur.requests += 1;
        cur.quantity += Number(item.quantity);
        cur.requested += Number(item.estimatedTotal);
        if (approved) cur.approved += Number(item.estimatedTotal);
        itemMap.set(key, cur);
      }
    }
    for (const po of linkedPos) {
      for (const item of po.items ?? []) {
        const cur = itemMap.get(item.itemName);
        if (cur) cur.purchased += Number(item.totalPrice);
      }
    }
    const topItems = [...itemMap.entries()]
      .map(([itemName, stats]) => ({ itemName, ...stats }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);

    const monthlyMap = new Map<string, { requests: number; amount: number; approved: number; purchased: number }>();
    for (const pr of prs) {
      const key = pr.createdAt.toISOString().slice(0, 7);
      const cur = monthlyMap.get(key) ?? { requests: 0, amount: 0, approved: 0, purchased: 0 };
      cur.requests += 1;
      const val = Number(pr.totalEstimate) || sumPrValue([pr]);
      cur.amount += val;
      if (isApproved(pr.status)) cur.approved += val;
      monthlyMap.set(key, cur);
    }
    for (const po of linkedPos) {
      const key = po.createdAt.toISOString().slice(0, 7);
      const cur = monthlyMap.get(key) ?? { requests: 0, amount: 0, approved: 0, purchased: 0 };
      cur.purchased += Number(po.totalAmount);
      monthlyMap.set(key, cur);
    }
    const trend = [...monthlyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, stats]) => ({ period, ...stats }));

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const alerts: { type: string; message: string; count?: number }[] = [];
    const overduePending = prs.filter((p) => p.status === 'PENDING' && p.createdAt < threeDaysAgo);
    if (overduePending.length) {
      alerts.push({
        type: 'overdue',
        message: `${overduePending.length} requests have been waiting for approval for more than 3 days.`,
        count: overduePending.length,
      });
    }
    const highValue = prs.filter((p) => (Number(p.totalEstimate) || 0) > 5_000_000);
    if (highValue.length) {
      alerts.push({
        type: 'high_value',
        message: `${highValue.length} high-value requests exceed Frw 5M.`,
        count: highValue.length,
      });
    }
    const unapproved = prs.filter((p) => isPending(p.status));
    if (unapproved.length) {
      alerts.push({
        type: 'unapproved',
        message: `Frw ${Math.round(pendingValue).toLocaleString()} remains pending approval.`,
        count: unapproved.length,
      });
    }

    const budgets = await prisma.budget.aggregate({
      where: { organizationId, year: new Date().getFullYear() },
      _sum: { totalBudget: true, spent: true },
    });
    const annualBudget = Number(budgets._sum.totalBudget ?? 0);
    const budgetSpent = Number(budgets._sum.spent ?? 0);

    const insights: string[] = [];
    if (byDepartment.length >= 2) {
      insights.push(
        `${byDepartment[0].department} leads procurement spending at Frw ${Math.round(byDepartment[0].total).toLocaleString()}.`,
      );
    }
    if (topItems[0]) {
      insights.push(`${topItems[0].itemName} is the most requested item (${topItems[0].requests} requests).`);
    }
    if (pendingValue > 0) {
      insights.push(`Frw ${Math.round(pendingValue).toLocaleString()} remains pending approval.`);
    }
    if (byCategory[0]) {
      insights.push(`${byCategory[0].category} accounts for ${byCategory[0].percentage}% of procurement by category.`);
    }

    return {
      kpis: {
        totalRequests,
        requestedValue,
        approvedValue,
        purchasedValue,
        pendingValue,
        rejectedValue,
        averageRequest: avgRequest,
        completionRate,
      },
      pipeline,
      trend,
      byCategory,
      byDepartment,
      topItems,
      alerts,
      insights,
      budget: {
        annual: annualBudget,
        committed: approvedValue,
        purchased: purchasedValue,
        remaining: Math.max(0, annualBudget - budgetSpent),
        utilizationPct: annualBudget > 0 ? Math.round((budgetSpent / annualBudget) * 100) : 0,
      },
      comparisonNote: 'Compared with previous period when filters change',
    };
  }

  async getDepartmentSpending(organizationId: string, filters: AnalyticsFilters) {
    const where = buildPrWhere(organizationId, filters);

    const prs = await prisma.purchaseRequest.findMany({
      where,
      include: {
        department: true,
        items: true,
        purchaseOrders: true,
      },
    });

    const deptStats = new Map<
      string,
      {
        departmentId: string;
        department: string;
        requests: number;
        requested: number;
        approved: number;
        purchased: number;
      }
    >();

    for (const pr of prs) {
      const deptId = pr.departmentId;
      const deptName = pr.departmentOther?.trim() || pr.department?.name || 'Unknown';
      const cur = deptStats.get(deptId) ?? {
        departmentId: deptId,
        department: deptName,
        requests: 0,
        requested: 0,
        approved: 0,
        purchased: 0,
      };
      const val = Number(pr.totalEstimate) || sumPrValue([pr]);
      cur.requests += 1;
      cur.requested += val;
      if (isApproved(pr.status)) cur.approved += val;
      for (const po of pr.purchaseOrders) {
        cur.purchased += Number(po.totalAmount);
      }
      deptStats.set(deptId, cur);
    }

    const ranking = [...deptStats.values()]
      .map((d) => ({
        ...d,
        utilization: d.requested > 0 ? Math.round((d.purchased / d.requested) * 100) : 0,
      }))
      .sort((a, b) => b.requested - a.requested);

    const totalSpending = ranking.reduce((s, d) => s + d.requested, 0);
    const totalPurchased = ranking.reduce((s, d) => s + d.purchased, 0);
    const totalApproved = ranking.reduce((s, d) => s + d.approved, 0);
    const highest = ranking[0];

    const budgets = await prisma.budget.findMany({
      where: { organizationId },
    });
    const budgetByDept = new Map(
      budgets
        .filter((b) => b.departmentId)
        .map((b) => [b.departmentId!, Number(b.totalBudget)]),
    );

    const utilization = ranking.map((d) => {
      const budget = budgetByDept.get(d.departmentId) ?? d.requested * 1.2;
      const pct = budget > 0 ? Math.round((d.purchased / budget) * 100) : 0;
      let status: 'healthy' | 'approaching' | 'over' = 'healthy';
      if (pct >= 100) status = 'over';
      else if (pct >= 80) status = 'approaching';
      return {
        departmentId: d.departmentId,
        department: d.department,
        budget,
        requested: d.requested,
        approved: d.approved,
        purchased: d.purchased,
        remaining: Math.max(0, budget - d.purchased),
        utilizationPct: pct,
        status,
      };
    });

    return {
      kpis: {
        totalDepartments: ranking.length,
        totalSpending,
        totalApproved,
        totalPurchased,
        highestSpending: highest?.requested ?? 0,
        averageSpend: ranking.length > 0 ? totalSpending / ranking.length : 0,
      },
      ranking,
      utilization,
    };
  }

  async getDepartmentDetail(organizationId: string, departmentId: string, filters: AnalyticsFilters) {
    const detailFilters = { ...filters, departmentId };
    const where = buildPrWhere(organizationId, detailFilters);

    const prs = await prisma.purchaseRequest.findMany({
      where,
      include: {
        items: { include: { category: true } },
        purchaseOrders: true,
      },
    });

    const categoryMap = new Map<string, number>();
    const itemCounts = new Map<string, number>();
    const requesterMap = new Map<
      string,
      { name: string; requests: number; value: number; approved: number; purchased: number }
    >();

    for (const pr of prs) {
      const val = Number(pr.totalEstimate) || sumPrValue([pr]);
      const purchased = pr.purchaseOrders.reduce((s, po) => s + Number(po.totalAmount), 0);
      const reqKey = pr.requestedBy;
      const reqCur = requesterMap.get(reqKey) ?? {
        name: pr.requestedByName ?? reqKey,
        requests: 0,
        value: 0,
        approved: 0,
        purchased: 0,
      };
      reqCur.requests += 1;
      reqCur.value += val;
      reqCur.purchased += purchased;
      if (isApproved(pr.status)) reqCur.approved += val;
      requesterMap.set(reqKey, reqCur);

      for (const item of pr.items) {
        const cat = item.category?.name ?? 'Other';
        categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + Number(item.estimatedTotal));
        itemCounts.set(item.itemName, (itemCounts.get(item.itemName) ?? 0) + 1);
      }
    }

    return {
      topCategories: [...categoryMap.entries()]
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8),
      topItems: [...itemCounts.entries()]
        .map(([itemName, count]) => ({ itemName, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      requesters: [...requesterMap.values()].sort((a, b) => b.value - a.value),
      totalRequests: prs.length,
      totalRequested: sumPrValue(prs),
      totalPurchased: prs.reduce(
        (s, pr) => s + pr.purchaseOrders.reduce((ps, po) => ps + Number(po.totalAmount), 0),
        0,
      ),
    };
  }

  async getRequesterAnalysis(organizationId: string, filters: AnalyticsFilters) {
    const where = buildPrWhere(organizationId, filters);

    const prs = await prisma.purchaseRequest.findMany({
      where,
      include: {
        department: true,
        items: { include: { category: true } },
        purchaseOrders: true,
      },
    });

    const requesterMap = new Map<
      string,
      {
        requesterId: string;
        name: string;
        department: string;
        requests: number;
        requested: number;
        approved: number;
        purchased: number;
        rejected: number;
        statuses: Record<string, number>;
        items: Map<string, number>;
        categories: Map<string, number>;
        months: Map<string, number>;
      }
    >();

    for (const pr of prs) {
      const key = pr.requestedBy;
      const dept = pr.departmentOther?.trim() || pr.department?.name || '—';
      const cur = requesterMap.get(key) ?? {
        requesterId: key,
        name: pr.requestedByName ?? key,
        department: dept,
        requests: 0,
        requested: 0,
        approved: 0,
        purchased: 0,
        rejected: 0,
        statuses: {} as Record<string, number>,
        items: new Map(),
        categories: new Map(),
        months: new Map(),
      };
      const val = Number(pr.totalEstimate) || sumPrValue([pr]);
      cur.requests += 1;
      cur.requested += val;
      if (isApproved(pr.status)) cur.approved += val;
      if (isRejected(pr.status)) cur.rejected += 1;
      cur.statuses[pr.status] = (cur.statuses[pr.status] ?? 0) + 1;
      for (const po of pr.purchaseOrders) cur.purchased += Number(po.totalAmount);

      const month = pr.createdAt.toISOString().slice(0, 7);
      cur.months.set(month, (cur.months.get(month) ?? 0) + 1);

      for (const item of pr.items) {
        cur.items.set(item.itemName, (cur.items.get(item.itemName) ?? 0) + 1);
        const cat = item.category?.name ?? 'Other';
        cur.categories.set(cat, (cur.categories.get(cat) ?? 0) + Number(item.estimatedTotal));
      }
      requesterMap.set(key, cur);
    }

    const all = [...requesterMap.values()];
    const topRequesters = all
      .map((r) => ({
        requesterId: r.requesterId,
        name: r.name,
        department: r.department,
        requests: r.requests,
        requested: r.requested,
        approved: r.approved,
        purchased: r.purchased,
        approvalRate: r.requests > 0 ? Math.round((r.approved / r.requested) * 100) : 0,
        rejected: r.rejected,
        averageRequest: r.requests > 0 ? r.requested / r.requests : 0,
      }))
      .sort((a, b) => b.requests - a.requests);

    const totalRequesters = all.length;
    const activeRequesters = all.filter((r) => r.requests > 0).length;
    const totalRequests = prs.length;
    const totalRequested = sumPrValue(prs);
    const totalApproved = sumPrValue(prs.filter((p) => isApproved(p.status)));
    const totalPurchased = all.reduce((s, r) => s + r.purchased, 0);

    const anomalies: { message: string; requesterId?: string }[] = [];
    for (const r of all) {
      if (r.requests >= 10) {
        anomalies.push({
          message: `${r.name} submitted ${r.requests} requests this period, above typical activity.`,
          requesterId: r.requesterId,
        });
      }
      const avg = r.requests > 0 ? r.requested / r.requests : 0;
      if (avg > 2_000_000) {
        anomalies.push({
          message: `${r.name} has an average request value of Frw ${Math.round(avg).toLocaleString()}, significantly above normal.`,
          requesterId: r.requesterId,
        });
      }
    }

    return {
      kpis: {
        totalRequesters,
        activeRequesters,
        totalRequests,
        totalRequested,
        totalApproved,
        totalPurchased,
        averageRequest: totalRequests > 0 ? totalRequested / totalRequests : 0,
      },
      topRequesters,
      anomalies: anomalies.slice(0, 8),
    };
  }

  async getRequesterProfile(organizationId: string, requesterId: string, filters: AnalyticsFilters) {
    const detailFilters = { ...filters, requesterId };
    const where = buildPrWhere(organizationId, detailFilters);

    const prs = await prisma.purchaseRequest.findMany({
      where,
      include: {
        department: true,
        items: { include: { category: true } },
        purchaseOrders: true,
      },
    });

    if (!prs.length) return null;

    const first = prs[0];
    const requested = sumPrValue(prs);
    const approved = sumPrValue(prs.filter((p) => isApproved(p.status)));
    const purchased = prs.reduce(
      (s, pr) => s + pr.purchaseOrders.reduce((ps, po) => ps + Number(po.totalAmount), 0),
      0,
    );
    const rejected = prs.filter((p) => isRejected(p.status)).length;

    const statusCounts: Record<string, number> = {};
    const itemMap = new Map<string, number>();
    const categoryMap = new Map<string, number>();
    const monthMap = new Map<string, number>();

    for (const pr of prs) {
      statusCounts[pr.status] = (statusCounts[pr.status] ?? 0) + 1;
      const month = pr.createdAt.toISOString().slice(0, 7);
      monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
      for (const item of pr.items) {
        itemMap.set(item.itemName, (itemMap.get(item.itemName) ?? 0) + 1);
        const cat = item.category?.name ?? 'Other';
        categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + Number(item.estimatedTotal));
      }
    }

    const catTotal = [...categoryMap.values()].reduce((a, b) => a + b, 0) || 1;

    return {
      name: first.requestedByName ?? requesterId,
      department: first.departmentOther?.trim() || first.department?.name || '—',
      requests: prs.length,
      requested,
      approved,
      purchased,
      approvalRate: requested > 0 ? Math.round((approved / requested) * 100) : 0,
      rejected,
      statusCounts,
      monthlyActivity: [...monthMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count })),
      topItems: [...itemMap.entries()]
        .map(([itemName, count]) => ({ itemName, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      categories: [...categoryMap.entries()]
        .map(([category, total]) => ({
          category,
          total,
          percentage: Math.round((total / catTotal) * 100),
        }))
        .sort((a, b) => b.total - a.total),
      averageRequestValue: prs.length > 0 ? requested / prs.length : 0,
      averageFrequency: prs.length > 0 ? prs.length / Math.max(1, monthMap.size) : 0,
    };
  }
}

export const analyticsService = new AnalyticsService();
