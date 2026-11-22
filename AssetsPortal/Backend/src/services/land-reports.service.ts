import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";
import { roundMoney } from "./land.service";
import { resolveLandYear } from "./land-dashboard.service";

export const LAND_REPORT_TYPES = [
  "register",
  "financial-summary",
  "by-location",
  "purchase-history",
  "balance",
  "category-type",
] as const;

export type LandReportType = (typeof LAND_REPORT_TYPES)[number];

export type LandReportFilters = {
  year?: number;
  province?: string;
  district?: string;
  sector?: string;
  category?: string;
  supplier?: string;
  from?: string;
  to?: string;
};

export function listLandReportTypes() {
  return LAND_REPORT_TYPES.map((type) => ({
    type,
    label:
      type === "register"
        ? "Land Register"
        : type === "financial-summary"
          ? "Land Financial Summary"
          : type === "by-location"
            ? "Land by Province and District"
            : type === "purchase-history"
              ? "Land Purchase History"
              : type === "balance"
                ? "Opening and Closing Balance"
                : "Land by Category and Type",
  }));
}

type LandRow = Awaited<ReturnType<typeof fetchRows>>[number];

async function fetchRows(organizationId: string, year: number, filters: LandReportFilters) {
  const where: Record<string, unknown> = { organizationId, year, deletedAt: null };
  for (const key of ["province", "district", "sector", "category", "supplier"] as const) {
    const value = filters[key];
    if (value && value !== "all") where[key] = { equals: value, mode: "insensitive" };
  }
  if (filters.from || filters.to) {
    where.purchaseDate = {
      ...(filters.from ? { gte: new Date(filters.from) } : {}),
      ...(filters.to ? { lte: new Date(filters.to) } : {}),
    };
  }
  return prisma.landRecord.findMany({
    where: where as never,
    orderBy: [{ sequence: "asc" }],
  });
}

function groupRows(rows: LandRow[], keys: Array<keyof LandRow>) {
  const map = new Map<string, { count: number; purchaseValue: number; size: number; sample: LandRow }>();
  for (const row of rows) {
    const parts = keys.map((key) => {
      const value = row[key];
      return value === null || value === undefined || String(value).trim() === ""
        ? "Unspecified"
        : String(value);
    });
    const id = parts.join(" • ");
    const entry = map.get(id) ?? { count: 0, purchaseValue: 0, size: 0, sample: row };
    entry.count += 1;
    entry.purchaseValue = roundMoney(entry.purchaseValue + row.purchaseUnitPrice);
    entry.size = roundMoney(entry.size + (row.sizeValue ?? 0));
    map.set(id, entry);
  }
  return Array.from(map.entries()).map(([label, value]) => ({ label, ...value }));
}

function moneyColumns() {
  return [
    { key: "openingAmount", label: "Opening Amount", type: "money" },
    { key: "purchaseUnitPrice", label: "Purchase Unit Price", type: "money" },
    { key: "totalBalance", label: "Total Balance", type: "money" },
  ];
}

function mapRow(row: LandRow) {
  return {
    no: row.sequence,
    province: row.province ?? "—",
    district: row.district ?? "—",
    sector: row.sector ?? "—",
    cellule: row.cellule ?? "—",
    village: row.village ?? "—",
    type: row.landType ?? "—",
    category: row.category ?? "—",
    supplier: row.supplier ?? "—",
    upi: row.upi ?? "—",
    sku: row.sku ?? "—",
    size: row.size ?? "—",
    material: row.material ?? "—",
    purchaseDate: row.purchaseDate ? row.purchaseDate.toISOString().slice(0, 10) : "—",
    openingAmount: row.openingAmount,
    purchaseUnitPrice: row.purchaseUnitPrice,
    totalBalance: row.totalBalance,
  };
}

export async function getLandReport(
  organizationId: string,
  type: string,
  filters: LandReportFilters = {}
) {
  if (!LAND_REPORT_TYPES.includes(type as LandReportType)) {
    throw new AppError(400, `Unknown Land report type. Valid: ${LAND_REPORT_TYPES.join(", ")}`);
  }

  const reportType = type as LandReportType;
  const year = await resolveLandYear(organizationId, filters.year);
  const [fy, setup, rows, tenant] = await Promise.all([
    prisma.financialYear.findUnique({
      where: { organizationId_year: { organizationId, year } },
      select: { year: true, status: true, startDate: true, endDate: true },
    }),
    prisma.landSetup.findFirst({ where: { organizationId, year } }),
    fetchRows(organizationId, year, filters),
    prisma.tenant.findFirst({ where: { organizationId } }),
  ]);

  if (!fy) throw new AppError(404, `Financial year ${year} was not found`);

  const openingAmount = roundMoney(setup?.openingAmount ?? 0);
  const totalPurchaseValue = roundMoney(
    rows.reduce((sum, row) => sum + row.purchaseUnitPrice, 0)
  );
  const closingBalance =
    rows.length > 0 ? rows[rows.length - 1].totalBalance : openingAmount;
  const totalSize = roundMoney(rows.reduce((sum, row) => sum + (row.sizeValue ?? 0), 0));

  const base = {
    generatedAt: new Date().toISOString(),
    organization: {
      name: tenant?.organizationName ?? "Organization",
      code: tenant?.organizationCode ?? null,
    },
    financialYear: {
      year,
      status: fy.status,
      startDate: fy.startDate,
      endDate: fy.endDate,
    },
    filters,
  };

  if (reportType === "register") {
    return {
      ...base,
      type: reportType,
      title: "Land Register",
      subtitle: `All registered land parcels for ${year}`,
      summary: [
        { label: "Land Records", value: rows.length, type: "number" },
        { label: "Opening Amount", value: openingAmount, type: "money" },
        { label: "Total Purchase Value", value: totalPurchaseValue, type: "money" },
        { label: "Closing Balance", value: closingBalance, type: "money" },
      ],
      columns: [
        { key: "no", label: "No.", type: "number" },
        { key: "province", label: "Province", type: "text" },
        { key: "district", label: "District", type: "text" },
        { key: "sector", label: "Sector", type: "text" },
        { key: "cellule", label: "Cellule", type: "text" },
        { key: "village", label: "Village", type: "text" },
        { key: "type", label: "Type", type: "text" },
        { key: "category", label: "Category", type: "text" },
        { key: "supplier", label: "Supplier", type: "text" },
        { key: "upi", label: "UPI", type: "text" },
        { key: "sku", label: "SKU", type: "text" },
        { key: "size", label: "Size", type: "text" },
        { key: "material", label: "Material", type: "text" },
        { key: "purchaseDate", label: "Purchase Date", type: "date" },
        ...moneyColumns(),
      ],
      rows: rows.map(mapRow),
    };
  }

  if (reportType === "financial-summary") {
    return {
      ...base,
      type: reportType,
      title: "Land Financial Summary",
      subtitle: `Financial position of the Land asset class for ${year}`,
      summary: [
        { label: "Opening Amount", value: openingAmount, type: "money" },
        { label: "Total Purchases", value: totalPurchaseValue, type: "money" },
        { label: "Closing Balance", value: closingBalance, type: "money" },
        { label: "Land Records", value: rows.length, type: "number" },
        { label: "Total Land Size", value: totalSize, type: "number" },
      ],
      columns: [
        { key: "metric", label: "Metric", type: "text" },
        { key: "value", label: "Value", type: "money" },
      ],
      rows: [
        { metric: "Opening Amount", value: openingAmount },
        { metric: "Total Purchase Value", value: totalPurchaseValue },
        { metric: "Closing Balance", value: closingBalance },
      ],
    };
  }

  if (reportType === "by-location") {
    const grouped = groupRows(rows, ["province", "district"]);
    return {
      ...base,
      type: reportType,
      title: "Land by Province and District",
      subtitle: `Distribution of land parcels and purchase value for ${year}`,
      summary: [
        { label: "Provinces Represented", value: groupRows(rows, ["province"]).length, type: "number" },
        { label: "Districts Represented", value: groupRows(rows, ["district"]).length, type: "number" },
        { label: "Total Purchase Value", value: totalPurchaseValue, type: "money" },
      ],
      columns: [
        { key: "province", label: "Province", type: "text" },
        { key: "district", label: "District", type: "text" },
        { key: "count", label: "Land Records", type: "number" },
        { key: "purchaseValue", label: "Purchase Value", type: "money" },
        { key: "size", label: "Total Size", type: "number" },
      ],
      rows: grouped.map((item) => {
        const [province, district] = item.label.split(" • ");
        return {
          province,
          district,
          count: item.count,
          purchaseValue: item.purchaseValue,
          size: item.size,
        };
      }),
    };
  }

  if (reportType === "purchase-history") {
    return {
      ...base,
      type: reportType,
      title: "Land Purchase History",
      subtitle: `Land parcels acquired in ${year}`,
      summary: [
        { label: "Purchases", value: rows.length, type: "number" },
        { label: "Total Purchase Value", value: totalPurchaseValue, type: "money" },
        { label: "Average Purchase Price", value: rows.length ? roundMoney(totalPurchaseValue / rows.length) : 0, type: "money" },
      ],
      columns: [
        { key: "purchaseDate", label: "Purchase Date", type: "date" },
        { key: "province", label: "Province", type: "text" },
        { key: "district", label: "District", type: "text" },
        { key: "supplier", label: "Supplier", type: "text" },
        { key: "upi", label: "UPI", type: "text" },
        { key: "purchaseUnitPrice", label: "Purchase Unit Price", type: "money" },
      ],
      rows: rows.map((row) => ({
        purchaseDate: row.purchaseDate ? row.purchaseDate.toISOString().slice(0, 10) : "—",
        province: row.province ?? "—",
        district: row.district ?? "—",
        supplier: row.supplier ?? "—",
        upi: row.upi ?? "—",
        purchaseUnitPrice: row.purchaseUnitPrice,
      })),
    };
  }

  if (reportType === "balance") {
    return {
      ...base,
      type: reportType,
      title: "Opening and Closing Balance",
      subtitle: `Sequential balance movement of the Land asset class for ${year}`,
      summary: [
        { label: "Opening Balance", value: openingAmount, type: "money" },
        { label: "Closing Balance", value: closingBalance, type: "money" },
        { label: "Net Movement", value: totalPurchaseValue, type: "money" },
      ],
      columns: [
        { key: "no", label: "No.", type: "number" },
        { key: "upi", label: "UPI", type: "text" },
        { key: "province", label: "Province", type: "text" },
        { key: "district", label: "District", type: "text" },
        ...moneyColumns(),
      ],
      rows: rows.map((row) => ({
        no: row.sequence,
        upi: row.upi ?? "—",
        province: row.province ?? "—",
        district: row.district ?? "—",
        openingAmount: row.openingAmount,
        purchaseUnitPrice: row.purchaseUnitPrice,
        totalBalance: row.totalBalance,
      })),
    };
  }

  const grouped = groupRows(rows, ["category", "landType"]);
  return {
    ...base,
    type: "category-type",
    title: "Land by Category and Type",
    subtitle: `Land classification summary for ${year}`,
    summary: [
      { label: "Categories", value: groupRows(rows, ["category"]).length, type: "number" },
      { label: "Types", value: groupRows(rows, ["landType"]).length, type: "number" },
      { label: "Total Purchase Value", value: totalPurchaseValue, type: "money" },
    ],
    columns: [
      { key: "category", label: "Category", type: "text" },
      { key: "type", label: "Type", type: "text" },
      { key: "count", label: "Land Records", type: "number" },
      { key: "purchaseValue", label: "Purchase Value", type: "money" },
      { key: "size", label: "Total Size", type: "number" },
    ],
    rows: grouped.map((item) => {
      const [category, type] = item.label.split(" • ");
      return {
        category,
        type,
        count: item.count,
        purchaseValue: item.purchaseValue,
        size: item.size,
      };
    }),
  };
}
