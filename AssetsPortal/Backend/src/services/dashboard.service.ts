import { prisma } from "../config/database";
import { getRegisterStats } from "./register.service";
import { getActiveFinancialYear, listFinancialYears } from "./year.service";
import { listCategories } from "./category.service";
import { seedTenantData } from "./seed.service";

function relativeTime(date: Date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function classifyAssetStatus(
  asset: {
    id: string;
    assetHealthStatus: string;
    assetsStatus: string | null;
    conditionCode: string | null;
  },
  assignedIds: Set<string>,
  maintenanceIds: Set<string>
) {
  const status = (asset.assetsStatus || "").toLowerCase();
  if (
    asset.assetHealthStatus === "NotUsedOld" ||
    status.includes("retire") ||
    status.includes("replaced")
  ) {
    return "retired" as const;
  }
  if (status.includes("missing") || status.includes("lost")) return "missing" as const;
  if (status.includes("damage") || asset.conditionCode === "Poor") return "damaged" as const;
  if (maintenanceIds.has(asset.id) || status.includes("maintenance")) return "maintenance" as const;
  if (assignedIds.has(asset.id) || status.includes("assign")) return "assigned" as const;
  return "available" as const;
}

export async function getDashboard(
  organizationId: string,
  opts?: { registerYear?: number; category?: string; location?: string }
) {
  await seedTenantData(organizationId);

  const assetWhere = {
    organizationId,
    deletedAt: null as null,
    ...(opts?.registerYear ? { registerYear: opts.registerYear } : {}),
    ...(opts?.category ? { categoryName: { equals: opts.category, mode: "insensitive" as const } } : {}),
    ...(opts?.location
      ? {
          OR: [
            { location: { contains: opts.location, mode: "insensitive" as const } },
            { locationLabel: { contains: opts.location, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [
    stats,
    activeFy,
    categories,
    years,
    assignments,
    maintenanceOpen,
    assets,
    activeAssignments,
    openMaintenanceRows,
    recentAssignments,
    recentTransfers,
    recentMaintenance,
    recentReturns,
  ] = await Promise.all([
    getRegisterStats(organizationId, opts?.registerYear),
    getActiveFinancialYear(organizationId),
    listCategories(organizationId),
    listFinancialYears(organizationId),
    prisma.assetAssignment.count({ where: { organizationId, status: "Active" } }),
    prisma.assetMaintenance.count({
      where: { organizationId, status: { in: ["Open", "InProgress", "Overdue"] } },
    }),
    prisma.asset.findMany({ where: assetWhere }),
    prisma.assetAssignment.findMany({
      where: { organizationId, status: "Active", returnedAt: null },
      select: { assetId: true },
    }),
    prisma.assetMaintenance.findMany({
      where: { organizationId, status: { in: ["Open", "InProgress", "Overdue"] } },
      select: { assetId: true },
    }),
    prisma.assetAssignment.findMany({
      where: { organizationId },
      include: { asset: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.assetTransfer.findMany({
      where: { organizationId },
      include: { asset: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.assetMaintenance.findMany({
      where: { organizationId },
      select: {
        id: true,
        description: true,
        createdAt: true,
        asset: { select: { assetName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.assetAssignment.findMany({
      where: { organizationId, returnedAt: { not: null } },
      include: { asset: true },
      orderBy: { returnedAt: "desc" },
      take: 8,
    }),
  ]);

  const assignedIds = new Set(activeAssignments.map((a) => a.assetId));
  const maintenanceIds = new Set(openMaintenanceRows.map((m) => m.assetId));

  const statusCounts = {
    available: 0,
    assigned: 0,
    maintenance: 0,
    damaged: 0,
    missing: 0,
    retired: 0,
  };

  for (const asset of assets) {
    const bucket = classifyAssetStatus(asset, assignedIds, maintenanceIds);
    statusCounts[bucket] += 1;
  }

  const valueByCategoryMap = assets.reduce(
    (acc, a) => {
      acc[a.categoryName] = (acc[a.categoryName] ?? 0) + a.netBookValue;
      return acc;
    },
    {} as Record<string, number>
  );

  const valueByCategory = Object.entries(valueByCategoryMap)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const totalAssets = assets.length;
  const totalValue = assets.reduce((s, a) => s + a.netBookValue, 0);

  const maintenanceStats = {
    open: await prisma.assetMaintenance.count({
      where: { organizationId, status: { in: ["Open", "Pending"] } },
    }),
    inProgress: await prisma.assetMaintenance.count({
      where: { organizationId, status: "InProgress" },
    }),
    completed: await prisma.assetMaintenance.count({
      where: { organizationId, status: "Completed" },
    }),
    overdue: await prisma.assetMaintenance.count({
      where: { organizationId, status: "Overdue" },
    }),
  };

  type Activity = {
    id: string;
    type: "assignment" | "transfer" | "maintenance" | "return";
    title: string;
    detail?: string;
    at: string;
    relative: string;
  };

  const activities: Activity[] = [
    ...recentAssignments
      .filter((r) => !r.returnedAt)
      .map((r) => ({
        id: `a-${r.id}`,
        type: "assignment" as const,
        title: `${r.asset?.assetName ?? "Asset"} assigned to ${r.assigneeName ?? "staff"}`,
        at: r.createdAt.toISOString(),
        relative: relativeTime(r.createdAt),
      })),
    ...recentTransfers.map((r) => ({
      id: `t-${r.id}`,
      type: "transfer" as const,
      title: `${r.asset?.assetName ?? "Asset"} transferred`,
      detail: [r.fromLocation, r.toLocation].filter(Boolean).join(" → ") || undefined,
      at: r.createdAt.toISOString(),
      relative: relativeTime(r.createdAt),
    })),
    ...recentMaintenance.map((r) => ({
      id: `m-${r.id}`,
      type: "maintenance" as const,
      title: `${r.asset?.assetName ?? "Asset"} sent for maintenance`,
      detail: r.description?.slice(0, 80) || undefined,
      at: r.createdAt.toISOString(),
      relative: relativeTime(r.createdAt),
    })),
    ...recentReturns.map((r) => ({
      id: `r-${r.id}`,
      type: "return" as const,
      title: `${r.asset?.assetName ?? "Asset"} returned`,
      detail: r.assigneeName ? `From ${r.assigneeName}` : undefined,
      at: (r.returnedAt ?? r.createdAt).toISOString(),
      relative: relativeTime(r.returnedAt ?? r.createdAt),
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 12);

  const locations = [
    ...new Set(assets.map((a) => a.location || a.locationLabel).filter(Boolean)),
  ].sort();

  const tenant = await prisma.tenant.findUnique({ where: { organizationId } });

  return {
    organizationName: tenant?.organizationName ?? "Organization",
    activeYear: activeFy?.year ?? null,
    filters: {
      years: years.map((y) => y.year),
      categories: categories.map((c) => c.name),
      locations,
    },
    kpis: {
      totalAssets,
      totalCategories: categories.length,
      financialYears: years.length,
      activeAssignments: assignments,
      openMaintenance: maintenanceOpen,
      totalNetBook: stats.totalNetBook,
      totalAnnualDep: stats.totalAnnualDep,
      totalPurchase: stats.totalPurchase,
      totalValue,
      assigned: statusCounts.assigned,
      available: statusCounts.available,
      maintenance: statusCounts.maintenance,
      damaged: statusCounts.damaged,
      missing: statusCounts.missing,
      retired: statusCounts.retired,
      assignedPercent: totalAssets ? Math.round((statusCounts.assigned / totalAssets) * 1000) / 10 : 0,
      availablePercent: totalAssets ? Math.round((statusCounts.available / totalAssets) * 1000) / 10 : 0,
    },
    statusBreakdown: statusCounts,
    valueByCategory,
    byCategory: stats.byCategory,
    maintenanceStats,
    recentActivities: activities,
    years: years.map((y) => ({
      id: y.id,
      year: y.year,
      status: y.status,
      totalOpening: y.totalOpening,
      totalPurchases: y.totalPurchases,
      totalClosing: y.totalClosing,
    })),
  };
}

export async function getAnalytics(organizationId: string) {
  const assets = await prisma.asset.findMany({
    where: { organizationId, deletedAt: null },
  });
  const byYear = new Map<number, { purchase: number; nbv: number; dep: number; count: number }>();
  for (const a of assets) {
    const cur = byYear.get(a.registerYear) ?? { purchase: 0, nbv: 0, dep: 0, count: 0 };
    cur.purchase += a.unitPrice;
    cur.nbv += a.netBookValue;
    cur.dep += a.annualDep;
    cur.count += 1;
    byYear.set(a.registerYear, cur);
  }
  const health = {
    used: assets.filter((a) => a.assetHealthStatus === "Used").length,
    notUsedOld: assets.filter((a) => a.assetHealthStatus === "NotUsedOld").length,
  };
  return {
    byYear: [...byYear.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, v]) => ({ year, ...v })),
    health,
    topLocations: Object.entries(
      assets.reduce(
        (acc, a) => {
          const key = a.location || "Unspecified";
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      )
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value })),
    byCategory: Object.entries(
      assets.reduce(
        (acc, a) => {
          const key = a.categoryName || "Uncategorized";
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      )
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([label, value]) => ({ label, value })),
    valueByCategory: Object.entries(
      assets.reduce(
        (acc, a) => {
          const key = a.categoryName || "Uncategorized";
          acc[key] = (acc[key] ?? 0) + a.netBookValue;
          return acc;
        },
        {} as Record<string, number>
      )
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([label, value]) => ({ label, value: Math.round(value) })),
    totals: {
      assets: assets.length,
      purchase: Math.round(assets.reduce((s, a) => s + a.unitPrice, 0)),
      nbv: Math.round(assets.reduce((s, a) => s + a.netBookValue, 0)),
      depreciation: Math.round(assets.reduce((s, a) => s + a.annualDep, 0)),
    },
  };
}
