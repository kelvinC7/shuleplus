import { prisma } from "../config/database";
import { roundMoney } from "./land.service";

export type LandDashboardFilters = {
  year?: number;
  province?: string;
  district?: string;
  sector?: string;
  category?: string;
  supplier?: string;
};

type LandRow = {
  id: string;
  sequence: number;
  province: string | null;
  district: string | null;
  sector: string | null;
  category: string | null;
  landType: string | null;
  supplier: string | null;
  purchaseYear: number | null;
  year: number;
  purchaseUnitPrice: number;
  openingAmount: number;
  totalBalance: number;
  sizeValue: number | null;
};

function group(rows: LandRow[], key: keyof LandRow) {
  const map = new Map<string, { label: string; count: number; value: number; size: number }>();
  for (const row of rows) {
    const raw = row[key];
    const label = raw === null || raw === undefined || String(raw).trim() === "" ? "Unspecified" : String(raw);
    const entry = map.get(label) ?? { label, count: 0, value: 0, size: 0 };
    entry.count += 1;
    entry.value = roundMoney(entry.value + row.purchaseUnitPrice);
    entry.size = roundMoney(entry.size + (row.sizeValue ?? 0));
    map.set(label, entry);
  }
  return Array.from(map.values()).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

export async function resolveLandYear(organizationId: string, requested?: number) {
  if (requested && Number.isFinite(Number(requested))) return Number(requested);
  const active = await prisma.financialYear.findFirst({
    where: { organizationId, status: "Active" },
    orderBy: { year: "desc" },
  });
  if (active) return active.year;
  const latest = await prisma.financialYear.findFirst({
    where: { organizationId },
    orderBy: { year: "desc" },
  });
  return latest?.year ?? new Date().getFullYear();
}

export async function getLandDashboard(
  organizationId: string,
  filters: LandDashboardFilters = {}
) {
  const year = await resolveLandYear(organizationId, filters.year);

  const where: Record<string, unknown> = {
    organizationId,
    year,
    deletedAt: null,
  };
  for (const key of ["province", "district", "sector", "category", "supplier"] as const) {
    const value = filters[key];
    if (value && value !== "all") where[key] = { equals: value, mode: "insensitive" };
  }

  const [fy, setup, records, allProvinces, allDistricts, allSectors, allCategories, allSuppliers] =
    await Promise.all([
      prisma.financialYear.findUnique({
        where: { organizationId_year: { organizationId, year } },
        select: { year: true, status: true, startDate: true, endDate: true },
      }),
      prisma.landSetup.findFirst({ where: { organizationId, year } }),
      prisma.landRecord.findMany({
        where: where as never,
        orderBy: [{ sequence: "asc" }],
        select: {
          id: true,
          sequence: true,
          province: true,
          district: true,
          sector: true,
          category: true,
          landType: true,
          supplier: true,
          purchaseYear: true,
          year: true,
          purchaseUnitPrice: true,
          openingAmount: true,
          totalBalance: true,
          sizeValue: true,
        },
      }),
      prisma.landRecord.findMany({
        where: { organizationId, deletedAt: null },
        distinct: ["province"],
        select: { province: true },
      }),
      prisma.landRecord.findMany({
        where: { organizationId, deletedAt: null },
        distinct: ["district"],
        select: { district: true },
      }),
      prisma.landRecord.findMany({
        where: { organizationId, deletedAt: null },
        distinct: ["sector"],
        select: { sector: true },
      }),
      prisma.landRecord.findMany({
        where: { organizationId, deletedAt: null },
        distinct: ["category"],
        select: { category: true },
      }),
      prisma.landRecord.findMany({
        where: { organizationId, deletedAt: null },
        distinct: ["supplier"],
        select: { supplier: true },
      }),
    ]);

  const rows = records as LandRow[];
  const openingAmount = roundMoney(setup?.openingAmount ?? 0);
  const totalPurchaseValue = roundMoney(
    rows.reduce((sum, row) => sum + row.purchaseUnitPrice, 0)
  );
  const totalSize = roundMoney(rows.reduce((sum, row) => sum + (row.sizeValue ?? 0), 0));

  const trendMap = new Map<number, { year: number; value: number; count: number }>();
  for (const row of rows) {
    const trendYear = row.purchaseYear ?? row.year;
    const entry = trendMap.get(trendYear) ?? { year: trendYear, value: 0, count: 0 };
    entry.value = roundMoney(entry.value + row.purchaseUnitPrice);
    entry.count += 1;
    trendMap.set(trendYear, entry);
  }

  const values = (items: Array<{ [key: string]: string | null }>, key: string) =>
    Array.from(
      new Set(
        items
          .map((item) => item[key])
          .filter((v): v is string => Boolean(v && String(v).trim()))
      )
    ).sort((a, b) => a.localeCompare(b));

  return {
    financialYear: {
      year,
      status: fy?.status ?? "Draft",
      startDate: fy?.startDate ?? null,
      endDate: fy?.endDate ?? null,
      configured: Boolean(setup),
      openingAmount,
    },
    stats: {
      totalRecords: rows.length,
      openingAmount,
      totalPurchaseValue,
      totalLandBalance: roundMoney(openingAmount + totalPurchaseValue),
      totalSize,
      closingBalance: rows.length > 0 ? rows[rows.length - 1].totalBalance : openingAmount,
    },
    charts: {
      byProvince: group(rows, "province"),
      byDistrict: group(rows, "district"),
      byCategory: group(rows, "category"),
      byType: group(rows, "landType"),
      purchaseTrend: Array.from(trendMap.values()).sort((a, b) => a.year - b.year),
    },
    filters: {
      provinces: values(allProvinces, "province"),
      districts: values(allDistricts, "district"),
      sectors: values(allSectors, "sector"),
      categories: values(allCategories, "category"),
      suppliers: values(allSuppliers, "supplier"),
    },
  };
}
