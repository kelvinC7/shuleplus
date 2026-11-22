import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";
import { roundMoney } from "./vehicle.service";
import { resolveVehicleYear } from "./vehicle-dashboard.service";

export const VEHICLE_REPORT_TYPES = [
  "register",
  "purchase",
  "sale-balance",
  "financial-summary",
  "depreciation",
  "net-book-value",
  "location",
  "financial-year-comparison",
] as const;

export type VehicleReportType = (typeof VEHICLE_REPORT_TYPES)[number];

export type VehicleReportFilters = {
  year?: number;
  location?: string;
  type?: string;
  category?: string;
  supplier?: string;
  purchaseYear?: number;
  from?: string;
  to?: string;
};

const REPORT_LABELS: Record<VehicleReportType, string> = {
  register: "Vehicle Register",
  purchase: "Vehicle Purchase Report",
  "sale-balance": "Vehicle Sale Balance Report",
  "financial-summary": "Vehicle Financial Summary",
  depreciation: "Vehicle Depreciation Report",
  "net-book-value": "Vehicle Net Book Value Report",
  location: "Vehicle by Location",
  "financial-year-comparison": "Vehicle Financial Year Comparison",
};

export function listVehicleReportTypes() {
  return VEHICLE_REPORT_TYPES.map((type) => ({ type, label: REPORT_LABELS[type] }));
}

function applyFilters(
  organizationId: string,
  year: number | undefined,
  filters: VehicleReportFilters
) {
  const where: Record<string, unknown> = { organizationId, deletedAt: null };
  if (year) where.year = year;
  for (const key of ["location", "type", "category", "supplier"] as const) {
    const value = filters[key];
    if (value && value !== "all") {
      const field = key === "type" ? "vehicleType" : key;
      where[field] = { equals: value, mode: "insensitive" };
    }
  }
  if (filters.purchaseYear) where.purchaseYear = Number(filters.purchaseYear);
  if (filters.from || filters.to) {
    where.purchaseDate = {
      ...(filters.from ? { gte: new Date(filters.from) } : {}),
      ...(filters.to ? { lte: new Date(filters.to) } : {}),
    };
  }
  return where;
}

async function fetchRows(
  organizationId: string,
  year: number,
  filters: VehicleReportFilters
) {
  return prisma.vehicleRecord.findMany({
    where: applyFilters(organizationId, year, filters) as never,
    orderBy: [{ sequence: "asc" }],
  });
}

type VehicleRow = Awaited<ReturnType<typeof fetchRows>>[number];

function money(value: number) {
  return roundMoney(value);
}

function total(rows: VehicleRow[], key: keyof VehicleRow) {
  return roundMoney(
    rows.reduce((sum, row) => sum + (typeof row[key] === "number" ? (row[key] as number) : 0), 0)
  );
}

function dateString(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "—";
}

function mapRow(row: VehicleRow) {
  return {
    no: row.sequence,
    location: row.location ?? "—",
    name: row.name ?? "—",
    label: row.label ?? "—",
    type: row.vehicleType ?? "—",
    category: row.category ?? "—",
    supplier: row.supplier ?? "—",
    tax: row.tax ?? "—",
    upi: row.upi ?? "—",
    sku: row.sku ?? "—",
    size: row.size ?? "—",
    material: row.material ?? "—",
    purchaseDate: dateString(row.purchaseDate),
    openingAmount: row.openingAmount,
    purchaseUnitPrice: row.purchaseUnitPrice,
    saleBalance: row.saleBalance,
    totalBalance: row.totalBalance,
    accumulatedDepreciation: row.accumulatedDepreciation,
    annualDep: row.annualDep,
    totalDep: row.totalDep,
    netBookValue: row.netBookValue,
    quantity: row.quantity,
    depreciationMode: row.depMode,
    depreciationRate: row.depRate,
    usefulYears: row.usefulYears,
  };
}

export async function getVehicleReport(
  organizationId: string,
  type: string,
  filters: VehicleReportFilters = {}
) {
  if (!VEHICLE_REPORT_TYPES.includes(type as VehicleReportType)) {
    throw new AppError(
      400,
      `Unknown Vehicle report type. Valid: ${VEHICLE_REPORT_TYPES.join(", ")}`
    );
  }

  const reportType = type as VehicleReportType;
  const year = await resolveVehicleYear(organizationId, filters.year);
  const [fy, setup, rows, tenant] = await Promise.all([
    prisma.financialYear.findUnique({
      where: { organizationId_year: { organizationId, year } },
      select: { year: true, status: true, startDate: true, endDate: true },
    }),
    prisma.vehicleSetup.findFirst({ where: { organizationId, year } }),
    fetchRows(organizationId, year, filters),
    prisma.tenant.findFirst({ where: { organizationId } }),
  ]);

  if (!fy) throw new AppError(404, `Financial year ${year} was not found`);

  const openingAmount = money(setup?.openingAmount ?? 0);
  const totalPurchaseValue = total(rows, "purchaseUnitPrice");
  const totalSaleBalance = total(rows, "saleBalance");
  const totalBalance = roundMoney(openingAmount + totalPurchaseValue - totalSaleBalance);
  const accumulatedDepreciation = roundMoney(
    (setup?.accumulatedDepreciation ?? 0) + total(rows, "annualDep")
  );
  const annualDepreciation = total(rows, "annualDep");
  const totalDepreciation = total(rows, "totalDep");
  const netBookValue = total(rows, "netBookValue");
  const totalQuantity = rows.reduce((sum, row) => sum + (row.quantity ?? 1), 0);

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
      title: REPORT_LABELS[reportType],
      subtitle: `Complete vehicle register for ${year}`,
      summary: [
        { label: "Vehicle Records", value: rows.length, type: "number" },
        { label: "Opening Amount", value: openingAmount, type: "money" },
        { label: "Total Purchase Value", value: totalPurchaseValue, type: "money" },
        { label: "Total Sale Balance", value: totalSaleBalance, type: "money" },
        { label: "Total Balance", value: totalBalance, type: "money" },
        { label: "Net Book Value", value: netBookValue, type: "money" },
        { label: "Total Quantity", value: totalQuantity, type: "number" },
      ],
      columns: [
        { key: "no", label: "No.", type: "number" },
        { key: "location", label: "Location", type: "text" },
        { key: "name", label: "Vehicle Name", type: "text" },
        { key: "label", label: "Label", type: "text" },
        { key: "type", label: "Type", type: "text" },
        { key: "category", label: "Category", type: "text" },
        { key: "supplier", label: "Supplier", type: "text" },
        { key: "tax", label: "Tax", type: "text" },
        { key: "upi", label: "UPI", type: "text" },
        { key: "sku", label: "SKU", type: "text" },
        { key: "size", label: "Size", type: "text" },
        { key: "material", label: "Material", type: "text" },
        { key: "purchaseDate", label: "Purchase Date", type: "date" },
        { key: "openingAmount", label: "Opening Amount", type: "money" },
        { key: "purchaseUnitPrice", label: "Purchase Unit Price", type: "money" },
        { key: "saleBalance", label: "Sale Balance", type: "money" },
        { key: "totalBalance", label: "Total Balance", type: "money" },
        {
          key: "accumulatedDepreciation",
          label: "Accumulated Depreciation",
          type: "money",
        },
        { key: "annualDep", label: "Annual Depreciation", type: "money" },
        { key: "totalDep", label: "Total Depreciation", type: "money" },
        { key: "netBookValue", label: "Net Book Value", type: "money" },
        { key: "quantity", label: "Quantity", type: "number" },
        { key: "depreciationMode", label: "Depreciation Mode", type: "text" },
        { key: "depreciationRate", label: "Depreciation Rate (%)", type: "number" },
        { key: "usefulYears", label: "Useful Years", type: "number" },
      ],
      rows: rows.map(mapRow),
    };
  }

  if (reportType === "purchase") {
    return {
      ...base,
      type: reportType,
      title: REPORT_LABELS[reportType],
      subtitle: `Vehicles acquired in ${year}`,
      summary: [
        { label: "Purchases", value: rows.length, type: "number" },
        { label: "Total Purchase Value", value: totalPurchaseValue, type: "money" },
        {
          label: "Average Purchase Price",
          value: rows.length ? roundMoney(totalPurchaseValue / rows.length) : 0,
          type: "money",
        },
        { label: "Total Quantity", value: totalQuantity, type: "number" },
      ],
      columns: [
        { key: "purchaseDate", label: "Purchase Date", type: "date" },
        { key: "location", label: "Location", type: "text" },
        { key: "name", label: "Vehicle Name", type: "text" },
        { key: "type", label: "Type", type: "text" },
        { key: "supplier", label: "Supplier", type: "text" },
        { key: "upi", label: "UPI", type: "text" },
        { key: "sku", label: "SKU", type: "text" },
        { key: "purchaseUnitPrice", label: "Purchase Unit Price", type: "money" },
        { key: "quantity", label: "Quantity", type: "number" },
      ],
      rows: rows.map((row) => ({
        purchaseDate: dateString(row.purchaseDate),
        location: row.location ?? "—",
        name: row.name ?? "—",
        type: row.vehicleType ?? "—",
        supplier: row.supplier ?? "—",
        upi: row.upi ?? "—",
        sku: row.sku ?? "—",
        purchaseUnitPrice: row.purchaseUnitPrice,
        quantity: row.quantity,
      })),
    };
  }

  if (reportType === "sale-balance") {
    return {
      ...base,
      type: reportType,
      title: REPORT_LABELS[reportType],
      subtitle: `Vehicle sale balance adjustments for ${year}`,
      summary: [
        { label: "Records with Sale Balance", value: rows.filter((r) => r.saleBalance > 0).length, type: "number" },
        { label: "Total Sale Balance", value: totalSaleBalance, type: "money" },
        { label: "Total Purchase Value", value: totalPurchaseValue, type: "money" },
        { label: "Total Balance", value: totalBalance, type: "money" },
      ],
      columns: [
        { key: "no", label: "No.", type: "number" },
        { key: "purchaseDate", label: "Purchase Date", type: "date" },
        { key: "location", label: "Location", type: "text" },
        { key: "name", label: "Vehicle Name", type: "text" },
        { key: "upi", label: "UPI", type: "text" },
        { key: "purchaseUnitPrice", label: "Purchase Unit Price", type: "money" },
        { key: "saleBalance", label: "Sale Balance", type: "money" },
        { key: "totalBalance", label: "Total Balance", type: "money" },
      ],
      rows: rows.map((row) => ({
        no: row.sequence,
        purchaseDate: dateString(row.purchaseDate),
        location: row.location ?? "—",
        name: row.name ?? "—",
        upi: row.upi ?? "—",
        purchaseUnitPrice: row.purchaseUnitPrice,
        saleBalance: row.saleBalance,
        totalBalance: row.totalBalance,
      })),
    };
  }

  if (reportType === "financial-summary") {
    return {
      ...base,
      type: reportType,
      title: REPORT_LABELS[reportType],
      subtitle: `Financial position of the Vehicle asset class for ${year}`,
      summary: [
        { label: "Vehicle Records", value: rows.length, type: "number" },
        { label: "Opening Amount", value: openingAmount, type: "money" },
        { label: "Total Purchase Value", value: totalPurchaseValue, type: "money" },
        { label: "Total Sale Balance", value: totalSaleBalance, type: "money" },
        { label: "Total Balance", value: totalBalance, type: "money" },
        { label: "Net Book Value", value: netBookValue, type: "money" },
      ],
      columns: [
        { key: "metric", label: "Metric", type: "text" },
        { key: "value", label: "Value", type: "number" },
      ],
      rows: [
        { metric: "Opening Amount", value: openingAmount },
        { metric: "Purchase Unit Price Total", value: totalPurchaseValue },
        { metric: "Sale Balance Total", value: totalSaleBalance },
        { metric: "Total Balance", value: totalBalance },
        { metric: "Accumulated Depreciation", value: accumulatedDepreciation },
        { metric: "Annual Depreciation", value: annualDepreciation },
        { metric: "Total Depreciation", value: totalDepreciation },
        { metric: "Net Book Value", value: netBookValue },
        { metric: "Total Vehicle Quantity", value: totalQuantity },
      ],
    };
  }

  if (reportType === "depreciation") {
    return {
      ...base,
      type: reportType,
      title: REPORT_LABELS[reportType],
      subtitle: `Depreciation of the Vehicle asset class for ${year}`,
      summary: [
        { label: "Depreciation Rate", value: setup?.depreciationRate ?? 0, type: "number" },
        { label: "Depreciation Mode", value: setup?.depreciationMode ?? "Diminishing", type: "text" },
        { label: "Opening Accumulated Depreciation", value: roundMoney(setup?.accumulatedDepreciation ?? 0), type: "money" },
        { label: "Annual Depreciation", value: annualDepreciation, type: "money" },
        { label: "Total Depreciation", value: totalDepreciation, type: "money" },
        { label: "Net Book Value", value: netBookValue, type: "money" },
      ],
      columns: [
        { key: "no", label: "No.", type: "number" },
        { key: "name", label: "Vehicle Name", type: "text" },
        { key: "upi", label: "UPI", type: "text" },
        { key: "totalBalance", label: "Total Balance", type: "money" },
        { key: "accumulatedDepreciation", label: "Accumulated Depreciation", type: "money" },
        { key: "depreciationRate", label: "Rate (%)", type: "number" },
        { key: "annualDep", label: "Annual Depreciation", type: "money" },
        { key: "totalDep", label: "Total Depreciation", type: "money" },
        { key: "netBookValue", label: "Net Book Value", type: "money" },
      ],
      rows: rows.map((row) => ({
        no: row.sequence,
        name: row.name ?? "—",
        upi: row.upi ?? "—",
        totalBalance: row.totalBalance,
        accumulatedDepreciation: row.accumulatedDepreciation,
        depreciationRate: row.depRate,
        annualDep: row.annualDep,
        totalDep: row.totalDep,
        netBookValue: row.netBookValue,
      })),
    };
  }

  if (reportType === "net-book-value") {
    return {
      ...base,
      type: reportType,
      title: REPORT_LABELS[reportType],
      subtitle: `Net book value of the Vehicle asset class for ${year}`,
      summary: [
        { label: "Total Balance", value: totalBalance, type: "money" },
        { label: "Total Depreciation", value: totalDepreciation, type: "money" },
        { label: "Net Book Value", value: netBookValue, type: "money" },
        { label: "Vehicle Records", value: rows.length, type: "number" },
      ],
      columns: [
        { key: "no", label: "No.", type: "number" },
        { key: "name", label: "Vehicle Name", type: "text" },
        { key: "location", label: "Location", type: "text" },
        { key: "upi", label: "UPI", type: "text" },
        { key: "totalBalance", label: "Total Balance", type: "money" },
        { key: "totalDep", label: "Total Depreciation", type: "money" },
        { key: "netBookValue", label: "Net Book Value", type: "money" },
      ],
      rows: rows.map((row) => ({
        no: row.sequence,
        name: row.name ?? "—",
        location: row.location ?? "—",
        upi: row.upi ?? "—",
        totalBalance: row.totalBalance,
        totalDep: row.totalDep,
        netBookValue: row.netBookValue,
      })),
    };
  }

  if (reportType === "location") {
    const map = new Map<
      string,
      {
        location: string;
        count: number;
        purchaseValue: number;
        saleBalance: number;
        totalBalance: number;
        netBookValue: number;
        quantity: number;
      }
    >();
    for (const row of rows) {
      const label = row.location?.trim() || "Unspecified";
      const entry =
        map.get(label) ?? {
          location: label,
          count: 0,
          purchaseValue: 0,
          saleBalance: 0,
          totalBalance: 0,
          netBookValue: 0,
          quantity: 0,
        };
      entry.count += 1;
      entry.purchaseValue = money(entry.purchaseValue + row.purchaseUnitPrice);
      entry.saleBalance = money(entry.saleBalance + row.saleBalance);
      entry.totalBalance = money(entry.totalBalance + row.totalBalance);
      entry.netBookValue = money(entry.netBookValue + row.netBookValue);
      entry.quantity += row.quantity ?? 1;
      map.set(label, entry);
    }
    const grouped = Array.from(map.values()).sort(
      (a, b) => b.purchaseValue - a.purchaseValue || a.location.localeCompare(b.location)
    );

    return {
      ...base,
      type: reportType,
      title: REPORT_LABELS[reportType],
      subtitle: `Vehicle distribution by location for ${year}`,
      summary: [
        { label: "Locations Represented", value: grouped.length, type: "number" },
        { label: "Total Purchase Value", value: totalPurchaseValue, type: "money" },
        { label: "Total Balance", value: totalBalance, type: "money" },
        { label: "Net Book Value", value: netBookValue, type: "money" },
      ],
      columns: [
        { key: "location", label: "Location", type: "text" },
        { key: "count", label: "Vehicles", type: "number" },
        { key: "quantity", label: "Quantity", type: "number" },
        { key: "purchaseValue", label: "Purchase Value", type: "money" },
        { key: "saleBalance", label: "Sale Balance", type: "money" },
        { key: "totalBalance", label: "Total Balance", type: "money" },
        { key: "netBookValue", label: "Net Book Value", type: "money" },
      ],
      rows: grouped,
    };
  }

  // financial-year-comparison
  const [years, setups, allRows] = await Promise.all([
    prisma.financialYear.findMany({
      where: { organizationId },
      orderBy: { year: "asc" },
      select: { id: true, year: true, status: true },
    }),
    prisma.vehicleSetup.findMany({ where: { organizationId } }),
    prisma.vehicleRecord.findMany({
      where: applyFilters(organizationId, undefined, filters) as never,
      orderBy: [{ year: "asc" }, { sequence: "asc" }],
    }),
  ]);

  const setupByYear = new Map(setups.map((s) => [s.year, s]));
  const comparison = years.map((entry) => {
    const yearRows = (allRows as VehicleRow[]).filter((row) => row.year === entry.year);
    const yearSetup = setupByYear.get(entry.year);
    const yearOpening = money(yearSetup?.openingAmount ?? 0);
    const purchase = total(yearRows, "purchaseUnitPrice");
    const sale = total(yearRows, "saleBalance");
    const annual = total(yearRows, "annualDep");
    const yearTotalDep = total(yearRows, "totalDep");
    return {
      year: entry.year,
      status: entry.status,
      count: yearRows.length,
      quantity: yearRows.reduce((sum, row) => sum + (row.quantity ?? 1), 0),
      openingAmount: yearOpening,
      purchaseValue: purchase,
      saleBalance: sale,
      totalBalance: roundMoney(yearOpening + purchase - sale),
      annualDepreciation: annual,
      totalDepreciation: yearTotalDep,
      netBookValue: total(yearRows, "netBookValue"),
    };
  });

  return {
    ...base,
    type: reportType,
    title: REPORT_LABELS[reportType],
    subtitle: "Vehicle financial performance across financial years",
    summary: [
      { label: "Financial Years", value: comparison.length, type: "number" },
      {
        label: "Total Purchase Value (all years)",
        value: roundMoney(comparison.reduce((sum, row) => sum + row.purchaseValue, 0)),
        type: "money",
      },
      {
        label: "Total Sale Balance (all years)",
        value: roundMoney(comparison.reduce((sum, row) => sum + row.saleBalance, 0)),
        type: "money",
      },
      {
        label: "Total Net Book Value (latest)",
        value: comparison.length ? comparison[comparison.length - 1].netBookValue : 0,
        type: "money",
      },
    ],
    columns: [
      { key: "year", label: "Financial Year", type: "number" },
      { key: "status", label: "Status", type: "text" },
      { key: "count", label: "Vehicles", type: "number" },
      { key: "quantity", label: "Quantity", type: "number" },
      { key: "openingAmount", label: "Opening Amount", type: "money" },
      { key: "purchaseValue", label: "Purchase Value", type: "money" },
      { key: "saleBalance", label: "Sale Balance", type: "money" },
      { key: "totalBalance", label: "Total Balance", type: "money" },
      { key: "annualDepreciation", label: "Annual Depreciation", type: "money" },
      { key: "totalDepreciation", label: "Total Depreciation", type: "money" },
      { key: "netBookValue", label: "Net Book Value", type: "money" },
    ],
    rows: comparison,
  };
}
