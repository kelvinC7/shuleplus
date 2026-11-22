import { prisma } from "../config/database";
import { roundMoney } from "./vehicle.service";

export type VehicleDashboardFilters = {
  year?: number;
  location?: string;
  type?: string;
  category?: string;
  supplier?: string;
  purchaseYear?: number;
};

type VehicleRow = {
  id: string;
  sequence: number;
  year: number;
  location: string | null;
  vehicleType: string | null;
  category: string | null;
  supplier: string | null;
  purchaseYear: number | null;
  purchaseUnitPrice: number;
  saleBalance: number;
  openingAmount: number;
  totalBalance: number;
  accumulatedDepreciation: number;
  annualDep: number;
  totalDep: number;
  netBookValue: number;
  quantity: number;
};

export async function resolveVehicleYear(organizationId: string, requested?: number) {
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

function baseFilters(filters: VehicleDashboardFilters) {
  const where: Record<string, unknown> = { deletedAt: null };
  for (const key of ["location", "type", "category", "supplier"] as const) {
    const value = filters[key];
    if (value && value !== "all") {
      const field = key === "type" ? "vehicleType" : key;
      where[field] = { equals: value, mode: "insensitive" };
    }
  }
  if (filters.purchaseYear) where.purchaseYear = Number(filters.purchaseYear);
  return where;
}

function emptyGroup() {
  return {
    count: 0,
    purchaseValue: 0,
    saleBalance: 0,
    totalBalance: 0,
    quantity: 0,
  };
}

function groupByKey(rows: VehicleRow[], key: keyof VehicleRow) {
  const map = new Map<string, { label: string; count: number; purchaseValue: number; saleBalance: number; totalBalance: number; quantity: number }>();
  for (const row of rows) {
    const raw = row[key];
    const label =
      raw === null || raw === undefined || String(raw).trim() === "" ? "Unspecified" : String(raw);
    const entry = map.get(label) ?? { label, ...emptyGroup() };
    entry.count += 1;
    entry.purchaseValue = roundMoney(entry.purchaseValue + row.purchaseUnitPrice);
    entry.saleBalance = roundMoney(entry.saleBalance + row.saleBalance);
    entry.totalBalance = roundMoney(entry.totalBalance + row.totalBalance);
    entry.quantity += row.quantity ?? 1;
    map.set(label, entry);
  }
  return Array.from(map.values()).sort(
    (a, b) => b.purchaseValue - a.purchaseValue || a.label.localeCompare(b.label)
  );
}

function groupByPurchaseYear(rows: VehicleRow[], metric: "purchaseUnitPrice" | "saleBalance") {
  const map = new Map<number, { year: number; value: number; count: number }>();
  for (const row of rows) {
    const year = row.purchaseYear ?? row.year;
    const entry = map.get(year) ?? { year, value: 0, count: 0 };
    entry.value = roundMoney(entry.value + (row[metric] ?? 0));
    entry.count += 1;
    map.set(year, entry);
  }
  return Array.from(map.values()).sort((a, b) => a.year - b.year);
}

export async function getVehicleDashboard(
  organizationId: string,
  filters: VehicleDashboardFilters = {}
) {
  const year = await resolveVehicleYear(organizationId, filters.year);
  const where = {
    organizationId,
    year,
    deletedAt: null,
    ...baseFilters(filters),
  };

  const crossYearWhere = {
    organizationId,
    deletedAt: null,
    ...baseFilters(filters),
  };

  const [
    fy,
    setup,
    records,
    allLocations,
    allTypes,
    allCategories,
    allSuppliers,
    allPurchaseYears,
    crossYearRows,
  ] = await Promise.all([
    prisma.financialYear.findUnique({
      where: { organizationId_year: { organizationId, year } },
      select: { year: true, status: true, startDate: true, endDate: true },
    }),
    prisma.vehicleSetup.findFirst({ where: { organizationId, year } }),
    prisma.vehicleRecord.findMany({
      where: where as never,
      orderBy: [{ sequence: "asc" }],
      select: {
        id: true,
        sequence: true,
        year: true,
        location: true,
        vehicleType: true,
        category: true,
        supplier: true,
        purchaseYear: true,
        purchaseUnitPrice: true,
        saleBalance: true,
        openingAmount: true,
        totalBalance: true,
        accumulatedDepreciation: true,
        annualDep: true,
        totalDep: true,
        netBookValue: true,
        quantity: true,
      },
    }),
    prisma.vehicleRecord.findMany({
      where: { organizationId, deletedAt: null },
      distinct: ["location"],
      select: { location: true },
    }),
    prisma.vehicleRecord.findMany({
      where: { organizationId, deletedAt: null },
      distinct: ["vehicleType"],
      select: { vehicleType: true },
    }),
    prisma.vehicleRecord.findMany({
      where: { organizationId, deletedAt: null },
      distinct: ["category"],
      select: { category: true },
    }),
    prisma.vehicleRecord.findMany({
      where: { organizationId, deletedAt: null },
      distinct: ["supplier"],
      select: { supplier: true },
    }),
    prisma.vehicleRecord.findMany({
      where: { organizationId, deletedAt: null, purchaseYear: { not: null } },
      distinct: ["purchaseYear"],
      select: { purchaseYear: true },
      orderBy: { purchaseYear: "desc" },
    }),
    prisma.vehicleRecord.findMany({
      where: crossYearWhere as never,
      select: {
        year: true,
        purchaseUnitPrice: true,
        saleBalance: true,
        openingAmount: true,
        totalBalance: true,
        annualDep: true,
        totalDep: true,
        netBookValue: true,
        quantity: true,
        purchaseYear: true,
        location: true,
        vehicleType: true,
        category: true,
        supplier: true,
        id: true,
        sequence: true,
        accumulatedDepreciation: true,
      },
      orderBy: [{ year: "asc" }, { sequence: "asc" }],
    }),
  ]);

  const rows = records as VehicleRow[];
  const openingAmount = roundMoney(setup?.openingAmount ?? 0);
  const totalPurchaseValue = roundMoney(
    rows.reduce((sum, row) => sum + row.purchaseUnitPrice, 0)
  );
  const totalSaleBalance = roundMoney(rows.reduce((sum, row) => sum + row.saleBalance, 0));
  const totalQuantity = rows.reduce((sum, row) => sum + (row.quantity ?? 1), 0);
  const totalAnnualDep = roundMoney(rows.reduce((sum, row) => sum + row.annualDep, 0));
  const totalDepreciation = roundMoney(rows.reduce((sum, row) => sum + row.totalDep, 0));
  const totalNetBookValue = roundMoney(rows.reduce((sum, row) => sum + row.netBookValue, 0));
  const closingBalance = roundMoney(openingAmount + totalPurchaseValue - totalSaleBalance);

  const crossYear = crossYearRows as VehicleRow[];
  const yearMap = new Map<
    number,
    {
      year: number;
      count: number;
      purchaseValue: number;
      saleBalance: number;
      totalBalance: number;
      annualDepreciation: number;
      totalDepreciation: number;
      accumulatedDepreciation: number;
      netBookValue: number;
      quantity: number;
    }
  >();
  for (const row of crossYear) {
    const entry = yearMap.get(row.year) ?? {
      year: row.year,
      count: 0,
      purchaseValue: 0,
      saleBalance: 0,
      totalBalance: 0,
      annualDepreciation: 0,
      totalDepreciation: 0,
      accumulatedDepreciation: 0,
      netBookValue: 0,
      quantity: 0,
    };
    entry.count += 1;
    entry.purchaseValue = roundMoney(entry.purchaseValue + row.purchaseUnitPrice);
    entry.saleBalance = roundMoney(entry.saleBalance + row.saleBalance);
    entry.totalBalance = roundMoney(entry.totalBalance + row.totalBalance);
    entry.annualDepreciation = roundMoney(entry.annualDepreciation + row.annualDep);
    entry.totalDepreciation = roundMoney(entry.totalDepreciation + row.totalDep);
    entry.accumulatedDepreciation = roundMoney(
      entry.accumulatedDepreciation + row.accumulatedDepreciation
    );
    entry.netBookValue = roundMoney(entry.netBookValue + row.netBookValue);
    entry.quantity += row.quantity ?? 1;
    yearMap.set(row.year, entry);
  }
  const yearly = Array.from(yearMap.values()).sort((a, b) => a.year - b.year);

  const values = (items: Array<Record<string, unknown>>, key: string) =>
    Array.from(
      new Set(
        items
          .map((item) => item[key])
          .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
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
      depreciationMode: setup?.depreciationMode ?? "Diminishing",
      depreciationRate: setup?.depreciationRate ?? 0,
      usefulYears: setup?.usefulYears ?? 0,
      accumulatedDepreciation: roundMoney(setup?.accumulatedDepreciation ?? 0),
    },
    stats: {
      totalVehicles: rows.length,
      openingAmount,
      totalPurchaseValue,
      totalSaleBalance,
      totalBalance: closingBalance,
      accumulatedDepreciation: roundMoney((setup?.accumulatedDepreciation ?? 0) + totalAnnualDep),
      annualDepreciation: totalAnnualDep,
      totalDepreciation,
      netBookValue: totalNetBookValue,
      totalQuantity,
      closingBalance,
    },
    charts: {
      byLocation: groupByKey(rows, "location"),
      byType: groupByKey(rows, "vehicleType"),
      byCategory: groupByKey(rows, "category"),
      purchaseValueByYear: groupByPurchaseYear(rows, "purchaseUnitPrice"),
      saleBalanceByYear: groupByPurchaseYear(rows, "saleBalance"),
      totalBalanceByFY: yearly.map((entry) => ({
        year: entry.year,
        value: entry.totalBalance,
        count: entry.count,
      })),
      depreciationTrends: yearly.map((entry) => ({
        year: entry.year,
        annualDepreciation: entry.annualDepreciation,
        totalDepreciation: entry.totalDepreciation,
        accumulatedDepreciation: entry.accumulatedDepreciation,
      })),
      netBookValueTrends: yearly.map((entry) => ({
        year: entry.year,
        netBookValue: entry.netBookValue,
        totalBalance: entry.totalBalance,
      })),
    },
    filters: {
      locations: values(allLocations, "location"),
      types: values(allTypes, "vehicleType"),
      categories: values(allCategories, "category"),
      suppliers: values(allSuppliers, "supplier"),
      purchaseYears: allPurchaseYears
        .map((r) => r.purchaseYear)
        .filter((v): v is number => v !== null)
        .sort((a, b) => b - a),
    },
  };
}
