import { Prisma } from "../generated/prisma";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";
import { getModuleActiveYear, resolveModuleActiveYear } from "./module-year.service";
import {
  computeAssetRegisterMath,
  computeRegisterTotalBalance,
  normalizeDepRatePercent,
  resolveRowDepRate,
} from "./register-math";

/**
 * Independent Vehicle asset module.
 *
 * Vehicles have their own setup, sequential balance chain and depreciation
 * configuration. The financial maths is delegated to the shared register math
 * helpers so that TOTAL BALANCE, annual / accumulated depreciation and net book
 * value behave exactly like the other asset categories (e.g. Furniture).
 */

const VEHICLE_CATEGORY = "Vehicles";

export type VehicleActor = {
  userId?: string | null;
  email?: string | null;
};

export type VehicleRecordInput = {
  location?: string | null;
  name?: string | null;
  label?: string | null;
  type?: string | null;
  category?: string | null;
  supplier?: string | null;
  tax?: string | number | null;
  upi?: string | null;
  sku?: string | null;
  size?: string | number | null;
  material?: string | null;
  purchase_year?: number | string | null;
  purchase_month?: number | string | null;
  purchase_day?: number | string | null;
  purchase_unit_price?: number | string | null;
  sale_balance?: number | string | null;
  saleBalance?: number | string | null;
  quantity?: number | string | null;
  dep_mode?: string | null;
  depreciation_mode?: string | null;
  depreciation_rate?: number | string | null;
  useful_years?: number | string | null;
  number_of_useful_years_depreciation?: number | string | null;
  use_setup_depreciation?: boolean | string | number | null;
  useSetupDepreciation?: boolean | string | number | null;
};

export type VehicleListFilters = {
  year?: number;
  location?: string;
  type?: string;
  category?: string;
  supplier?: string;
  purchaseYear?: number;
  q?: string;
  from?: string;
  to?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

export function roundMoney(value: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function cleanText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function preserveText(value: unknown, existing: string | null | undefined): string | null {
  if (value === undefined) return existing ?? null;
  return cleanText(value);
}

function optionalInt(value: unknown, label: string): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new AppError(400, `${label} must be a whole number`);
  }
  return n;
}

function parseMoney(value: unknown, label: string): number {
  if (value === undefined || value === null || value === "") {
    throw new AppError(400, `${label} is required`);
  }
  const n = typeof value === "string" ? Number(value.replace(/,/g, "").trim()) : Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new AppError(400, `${label} must be a valid positive number`);
  }
  return roundMoney(n);
}

function parseOptionalMoney(value: unknown, label: string, fallback = 0): number {
  if (value === undefined) return roundMoney(fallback);
  if (value === null || value === "") return 0;
  const n = typeof value === "string" ? Number(value.replace(/,/g, "").trim()) : Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new AppError(400, `${label} must be a valid positive number`);
  }
  return roundMoney(n);
}

function parseRate(value: unknown, fallback = 0): number {
  if (value === undefined) return normalizeDepRatePercent(fallback);
  if (value === null || value === "") return normalizeDepRatePercent(fallback);
  const n = typeof value === "string" ? Number(value.replace(/%/g, "").replace(/,/g, "").trim()) : Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new AppError(400, "Depreciation rate must be a valid positive number");
  }
  return normalizeDepRatePercent(n);
}

function parseWholeNumber(value: unknown, label: string, fallback: number, min = 0): number {
  if (value === undefined) return fallback;
  if (value === null || value === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < min) {
    throw new AppError(400, `${label} must be a whole number of at least ${min}`);
  }
  return n;
}

export function buildPurchaseDate(
  year: number | null,
  month: number | null,
  day: number | null
): Date | null {
  if (!year) return null;
  if (!month) return null;
  const d = day ?? 1;
  if (month < 1 || month > 12) throw new AppError(400, "purchase_month must be between 1 and 12");
  if (d < 1 || d > 31) throw new AppError(400, "purchase_day must be between 1 and 31");
  const date = new Date(Date.UTC(year, month - 1, d));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== d
  ) {
    throw new AppError(400, `Invalid purchase date ${year}-${month}-${d}`);
  }
  return date;
}

export function normalizeVehicleInput(input: VehicleRecordInput, existing?: {
  location: string | null;
  name: string | null;
  label: string | null;
  vehicleType: string | null;
  category: string | null;
  supplier: string | null;
  tax: string | null;
  upi: string | null;
  sku: string | null;
  size: string | null;
  material: string | null;
  purchaseYear: number | null;
  purchaseMonth: number | null;
  purchaseDay: number | null;
  purchaseUnitPrice: number;
  saleBalance: number;
  quantity: number;
  depRate: number;
  depMode: string;
  usefulYears: number;
  useSetupDepreciation: boolean;
}) {
  const purchaseYear =
    input.purchase_year === undefined
      ? existing?.purchaseYear ?? null
      : optionalInt(input.purchase_year, "purchase_year");
  const purchaseMonth =
    input.purchase_month === undefined
      ? existing?.purchaseMonth ?? null
      : optionalInt(input.purchase_month, "purchase_month");
  const purchaseDay =
    input.purchase_day === undefined
      ? existing?.purchaseDay ?? null
      : optionalInt(input.purchase_day, "purchase_day");

  if (purchaseYear !== null && (purchaseYear < 1900 || purchaseYear > 2200)) {
    throw new AppError(400, "purchase_year must be between 1900 and 2200");
  }
  if ((purchaseMonth !== null || purchaseDay !== null) && purchaseYear === null) {
    throw new AppError(400, "purchase_year is required when purchase_month or purchase_day is provided");
  }
  if (purchaseMonth !== null && (purchaseMonth < 1 || purchaseMonth > 12)) {
    throw new AppError(400, "purchase_month must be between 1 and 12");
  }
  if (purchaseDay !== null && (purchaseDay < 1 || purchaseDay > 31)) {
    throw new AppError(400, "purchase_day must be between 1 and 31");
  }

  const rawSale = input.sale_balance !== undefined ? input.sale_balance : input.saleBalance;
  const rateProvided =
    input.depreciation_rate !== undefined && input.depreciation_rate !== null && input.depreciation_rate !== "";
  const mode = cleanText(input.dep_mode ?? input.depreciation_mode);
  const yearsInput =
    input.useful_years !== undefined
      ? input.useful_years
      : input.number_of_useful_years_depreciation;
  const useSetupRaw = input.use_setup_depreciation ?? input.useSetupDepreciation;
  const useSetupDepreciation =
    useSetupRaw === undefined || useSetupRaw === null || useSetupRaw === ""
      ? rateProvided
        ? false
        : existing?.useSetupDepreciation ?? true
      : useSetupRaw === true || useSetupRaw === 1 || useSetupRaw === "1" || useSetupRaw === "true";

  return {
    location: preserveText(input.location, existing?.location),
    name: preserveText(input.name, existing?.name),
    label: preserveText(input.label, existing?.label),
    vehicleType: preserveText(input.type, existing?.vehicleType),
    category: preserveText(input.category, existing?.category) ?? VEHICLE_CATEGORY,
    supplier: preserveText(input.supplier, existing?.supplier),
    tax: preserveText(input.tax, existing?.tax),
    upi: preserveText(input.upi, existing?.upi),
    sku: preserveText(input.sku, existing?.sku),
    size: preserveText(input.size, existing?.size),
    material: preserveText(input.material, existing?.material),
    purchaseYear,
    purchaseMonth,
    purchaseDay,
    purchaseDate: buildPurchaseDate(purchaseYear, purchaseMonth, purchaseDay),
    purchaseUnitPrice:
      input.purchase_unit_price === undefined
        ? roundMoney(existing?.purchaseUnitPrice ?? 0)
        : parseMoney(input.purchase_unit_price, "Purchase unit price"),
    saleBalance: parseOptionalMoney(rawSale, "Sale balance", existing?.saleBalance ?? 0),
    quantity: parseWholeNumber(input.quantity, "Quantity", existing?.quantity ?? 1, 1),
    depRate: rateProvided ? parseRate(input.depreciation_rate, 0) : existing?.depRate ?? 0,
    depMode: mode ?? existing?.depMode ?? "Diminishing",
    usefulYears: parseWholeNumber(yearsInput, "Useful years", existing?.usefulYears ?? 0, 0),
    useSetupDepreciation,
  };
}

export async function requireFinancialYear(organizationId: string, year: number) {
  const fy = await prisma.financialYear.findUnique({
    where: { organizationId_year: { organizationId, year } },
  });
  if (!fy) throw new AppError(404, `Financial year ${year} was not found for this organization`);
  return fy;
}

export async function requireVehicleSetup(organizationId: string, financialYearId: string, year: number) {
  const setup = await prisma.vehicleSetup.findUnique({
    where: { organizationId_financialYearId: { organizationId, financialYearId } },
  });
  if (!setup) {
    throw new AppError(
      400,
      `Vehicle Setup is required for ${year}. Set the opening amount and depreciation configuration before registering vehicles.`
    );
  }
  return setup;
}

export function serializeVehicle<T extends {
  vehicleType?: string | null;
  depRate?: number | null;
}>(row: T) {
  return {
    ...row,
    type: row.vehicleType ?? null,
    decimalDepreciation:
      row.depRate != null ? Number((Number(row.depRate) / 100).toFixed(6)) : 0,
  };
}

export async function getVehicleMeta(organizationId: string) {
  const [years, setups, aggregates, purchaseYears, tenants, moduleActiveYear] = await Promise.all([
    prisma.financialYear.findMany({
      where: { organizationId },
      orderBy: { year: "desc" },
      include: { vehicleImportBatches: { orderBy: { createdAt: "desc" } } },
    }),
    prisma.vehicleSetup.findMany({ where: { organizationId } }),
    prisma.vehicleRecord.groupBy({
      by: ["location", "name", "label", "vehicleType", "category", "supplier"],
      where: { organizationId, deletedAt: null },
      _count: { _all: true },
    }),
    prisma.vehicleRecord.findMany({
      where: { organizationId, deletedAt: null, purchaseYear: { not: null } },
      distinct: ["purchaseYear"],
      select: { purchaseYear: true },
      orderBy: { purchaseYear: "desc" },
    }),
    prisma.tenant.findFirst({ where: { organizationId } }),
    getModuleActiveYear(organizationId, "vehicles"),
  ]);

  const distinct = (values: Array<string | null>) =>
    Array.from(new Set(values.filter((v): v is string => Boolean(v && v.trim())))).sort((a, b) =>
      a.localeCompare(b)
    );

  const setupByYear = new Map(setups.map((s) => [s.year, s]));
  const batchByYear = new Map<number, (typeof years)[number]["vehicleImportBatches"]>();
  for (const fy of years) batchByYear.set(fy.year, fy.vehicleImportBatches);

  return {
    organizationName: tenants?.organizationName ?? "Organization",
    years: years.map((fy) => {
      const setup = setupByYear.get(fy.year) ?? null;
      return {
        id: fy.id,
        year: fy.year,
        startDate: fy.startDate,
        endDate: fy.endDate,
        status: fy.status,
        setup: setup
          ? {
              id: setup.id,
              openingAmount: setup.openingAmount,
              accumulatedDepreciation: setup.accumulatedDepreciation,
              depreciationMode: setup.depreciationMode,
              depreciationRate: setup.depreciationRate,
              usefulYears: setup.usefulYears,
              updatedAt: setup.updatedAt,
            }
          : null,
        importCount: batchByYear.get(fy.year)?.length ?? 0,
      };
    }),
    activeYear: resolveModuleActiveYear(moduleActiveYear, years),
    locations: distinct(aggregates.map((a) => a.location)),
    names: distinct(aggregates.map((a) => a.name)),
    labels: distinct(aggregates.map((a) => a.label)),
    types: distinct(aggregates.map((a) => a.vehicleType)),
    categories: distinct(aggregates.map((a) => a.category)),
    suppliers: distinct(aggregates.map((a) => a.supplier)),
    purchaseYears: purchaseYears
      .map((r) => r.purchaseYear)
      .filter((v): v is number => v !== null)
      .sort((a, b) => b - a),
  };
}

export async function getVehicleSetup(organizationId: string, year: number) {
  const fy = await requireFinancialYear(organizationId, year);
  const [setup, aggregate, last] = await Promise.all([
    prisma.vehicleSetup.findUnique({
      where: { organizationId_financialYearId: { organizationId, financialYearId: fy.id } },
    }),
    prisma.vehicleRecord.aggregate({
      where: { organizationId, financialYearId: fy.id, deletedAt: null },
      _count: { _all: true },
      _sum: {
        purchaseUnitPrice: true,
        saleBalance: true,
        quantity: true,
        annualDep: true,
        totalDep: true,
        netBookValue: true,
      },
    }),
    prisma.vehicleRecord.findFirst({
      where: { organizationId, financialYearId: fy.id, deletedAt: null },
      orderBy: [{ sequence: "desc" }, { createdAt: "desc" }],
      select: { totalBalance: true },
    }),
  ]);

  const openingAmount = setup?.openingAmount ?? 0;
  const accumulatedStart = setup?.accumulatedDepreciation ?? 0;
  const totalAnnualDep = roundMoney(aggregate._sum.annualDep ?? 0);

  return {
    id: setup?.id ?? null,
    organizationId,
    financialYearId: fy.id,
    year: fy.year,
    configured: Boolean(setup),
    openingAmount,
    accumulatedDepreciation: accumulatedStart,
    depreciationMode: setup?.depreciationMode ?? "Diminishing",
    depreciationRate: setup?.depreciationRate ?? 0,
    usefulYears: setup?.usefulYears ?? 0,
    recordCount: aggregate._count._all,
    totalPurchaseValue: roundMoney(aggregate._sum.purchaseUnitPrice ?? 0),
    totalSaleBalance: roundMoney(aggregate._sum.saleBalance ?? 0),
    totalQuantity: aggregate._sum.quantity ?? 0,
    totalAnnualDepreciation: totalAnnualDep,
    // Class-level accumulated depreciation at year end.
    totalAccumulatedDepreciation: roundMoney(accumulatedStart + totalAnnualDep),
    totalDepreciation: roundMoney(aggregate._sum.totalDep ?? 0),
    totalNetBookValue: roundMoney(aggregate._sum.netBookValue ?? 0),
    closingBalance: setup ? last?.totalBalance ?? openingAmount : 0,
    updatedAt: setup?.updatedAt ?? null,
  };
}

export async function upsertVehicleSetup(
  organizationId: string,
  input: {
    year: number | string;
    opening_amount?: number | string;
    openingAmount?: number | string;
    accumulated_depreciation?: number | string;
    accumulatedDepreciation?: number | string;
    depreciation_mode?: string;
    depreciationMode?: string;
    depreciation_rate?: number | string;
    depreciationRate?: number | string;
    useful_years?: number | string;
    usefulYears?: number | string;
  },
  actor?: VehicleActor
) {
  const year = Number(input.year);
  if (!Number.isFinite(year)) throw new AppError(400, "Financial year is required");

  const openingRaw = input.opening_amount ?? input.openingAmount;
  const openingAmount = Number(
    typeof openingRaw === "string" ? openingRaw.replace(/,/g, "").trim() : openingRaw
  );
  if (!Number.isFinite(openingAmount) || openingAmount < 0) {
    throw new AppError(400, "Opening amount must be a valid positive number");
  }

  const accumulatedRaw = input.accumulated_depreciation ?? input.accumulatedDepreciation;
  const accumulatedDepreciation =
    accumulatedRaw === undefined || accumulatedRaw === null || accumulatedRaw === ""
      ? 0
      : Number(
          typeof accumulatedRaw === "string"
            ? accumulatedRaw.replace(/,/g, "").trim()
            : accumulatedRaw
        );
  if (!Number.isFinite(accumulatedDepreciation) || accumulatedDepreciation < 0) {
    throw new AppError(400, "Accumulated depreciation must be a valid positive number");
  }

  return prisma.$transaction(async (tx) => {
    const fy = await tx.financialYear.findUnique({
      where: { organizationId_year: { organizationId, year } },
    });
    if (!fy) throw new AppError(404, `Financial year ${year} was not found`);

    const existing = await tx.vehicleSetup.findUnique({
      where: { organizationId_financialYearId: { organizationId, financialYearId: fy.id } },
    });

    const modeRaw = input.depreciation_mode ?? input.depreciationMode;
    const mode = cleanText(modeRaw) ?? existing?.depreciationMode ?? "Diminishing";
    const rate = parseRate(
      input.depreciation_rate ?? input.depreciationRate,
      existing?.depreciationRate ?? 0
    );
    const usefulYears = parseWholeNumber(
      input.useful_years ?? input.usefulYears,
      "Useful years",
      existing?.usefulYears ?? 0,
      0
    );

    const setup = existing
      ? await tx.vehicleSetup.update({
          where: { id: existing.id },
          data: {
            openingAmount: roundMoney(openingAmount),
            accumulatedDepreciation: roundMoney(accumulatedDepreciation),
            depreciationMode: mode,
            depreciationRate: rate,
            usefulYears,
          },
        })
      : await tx.vehicleSetup.create({
          data: {
            organizationId,
            financialYearId: fy.id,
            year,
            openingAmount: roundMoney(openingAmount),
            accumulatedDepreciation: roundMoney(accumulatedDepreciation),
            depreciationMode: mode,
            depreciationRate: rate,
            usefulYears,
            createdByUserId: actor?.userId ?? null,
            createdByEmail: actor?.email ?? null,
          },
        });

    const chain = await recalcVehicleChain(tx, organizationId, fy.id, setup);

    await tx.vehicleAuditLog.create({
      data: {
        organizationId,
        financialYearId: fy.id,
        year,
        action: existing ? "setup_update" : "setup_create",
        detail: existing
          ? `Vehicle setup updated for ${year}`
          : `Vehicle setup created for ${year}`,
        metadata: {
          previous: existing
            ? {
                openingAmount: existing.openingAmount,
                accumulatedDepreciation: existing.accumulatedDepreciation,
                depreciationMode: existing.depreciationMode,
                depreciationRate: existing.depreciationRate,
                usefulYears: existing.usefulYears,
              }
            : null,
          next: {
            openingAmount: setup.openingAmount,
            accumulatedDepreciation: setup.accumulatedDepreciation,
            depreciationMode: setup.depreciationMode,
            depreciationRate: setup.depreciationRate,
            usefulYears: setup.usefulYears,
          },
          affectedRecords: chain.recordCount,
          closingBalance: chain.closingBalance,
        },
        actorUserId: actor?.userId ?? null,
        actorEmail: actor?.email ?? null,
      },
    });

    return setup.id;
  }).then(() => getVehicleSetup(organizationId, year));
}

type Tx = Prisma.TransactionClient;

type VehicleRow = {
  id: string;
  sequence: number;
  purchaseUnitPrice: number;
  saleBalance: number;
  openingAmount: number;
  totalBalance: number;
  accumulatedDepreciation: number;
  annualDep: number;
  totalDep: number;
  netBookValue: number;
  depRate: number;
  depMode: string;
  usefulYears: number;
  useSetupDepreciation: boolean;
  quantity: number;
};

export type VehicleDepreciationSetup = {
  openingAmount: number;
  accumulatedDepreciation: number;
  depreciationRate: number;
  depreciationMode: string;
  usefulYears: number;
};

export function computeVehicleRowMath(row: VehicleRow, setup: VehicleDepreciationSetup, opening: number) {
  const saleBalance = Math.max(0, Number(row.saleBalance) || 0);
  const rate = row.useSetupDepreciation
    ? normalizeDepRatePercent(setup.depreciationRate)
    : resolveRowDepRate(row.depRate, setup.depreciationRate);

  const totalBalance = roundMoney(
    computeRegisterTotalBalance({
      opening,
      purchasePrice: row.purchaseUnitPrice,
      categoryName: VEHICLE_CATEGORY,
      saleBalance,
      applySaleBalance: true,
    })
  );

  const math = computeAssetRegisterMath({
    opening,
    purchasePrice: row.purchaseUnitPrice,
    accumulatedStart: setup.accumulatedDepreciation,
    rate,
    categoryName: VEHICLE_CATEGORY,
    saleBalance,
    applySaleBalance: true,
  });

  return {
    openingAmount: roundMoney(opening),
    totalBalance,
    accumulatedDepreciation: roundMoney(math.accumulatedStart),
    annualDep: roundMoney(math.annualDep),
    totalDep: roundMoney(math.totalDep),
    netBookValue: roundMoney(math.netBookValue),
    depRate: roundMoney(math.rate),
    depMode: row.useSetupDepreciation
      ? setup.depreciationMode
      : row.depMode || setup.depreciationMode,
    usefulYears: row.useSetupDepreciation ? setup.usefulYears : row.usefulYears || setup.usefulYears,
  };
}

export async function recalcVehicleChain(
  tx: Tx,
  organizationId: string,
  financialYearId: string,
  setup: {
    openingAmount: number;
    accumulatedDepreciation: number;
    depreciationRate: number;
    depreciationMode: string;
    usefulYears: number;
  }
) {
  const records = (await tx.vehicleRecord.findMany({
    where: { organizationId, financialYearId, deletedAt: null },
    orderBy: [{ sequence: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  })) as unknown as VehicleRow[];

  let opening = roundMoney(setup.openingAmount);
  let totalPurchaseValue = 0;
  let totalSaleBalance = 0;
  let totalQuantity = 0;
  let totalAnnualDep = 0;
  let totalDepreciation = 0;
  let totalNetBookValue = 0;

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const math = computeVehicleRowMath(record, setup, opening);

    totalPurchaseValue = roundMoney(totalPurchaseValue + record.purchaseUnitPrice);
    totalSaleBalance = roundMoney(totalSaleBalance + (record.saleBalance ?? 0));
    totalQuantity += record.quantity ?? 1;
    totalAnnualDep = roundMoney(totalAnnualDep + math.annualDep);
    totalDepreciation = roundMoney(totalDepreciation + math.totalDep);
    totalNetBookValue = roundMoney(totalNetBookValue + math.netBookValue);

    if (
      record.sequence !== index + 1 ||
      roundMoney(record.openingAmount) !== math.openingAmount ||
      roundMoney(record.totalBalance) !== math.totalBalance ||
      roundMoney(record.accumulatedDepreciation) !== math.accumulatedDepreciation ||
      roundMoney(record.annualDep) !== math.annualDep ||
      roundMoney(record.totalDep) !== math.totalDep ||
      roundMoney(record.netBookValue) !== math.netBookValue ||
      roundMoney(record.depRate) !== math.depRate ||
      record.depMode !== math.depMode ||
      record.usefulYears !== math.usefulYears
    ) {
      await tx.vehicleRecord.update({
        where: { id: record.id },
        data: {
          sequence: index + 1,
          openingAmount: math.openingAmount,
          totalBalance: math.totalBalance,
          accumulatedDepreciation: math.accumulatedDepreciation,
          annualDep: math.annualDep,
          totalDep: math.totalDep,
          netBookValue: math.netBookValue,
          depRate: record.useSetupDepreciation
            ? normalizeDepRatePercent(setup.depreciationRate)
            : math.depRate,
          depMode: math.depMode,
          usefulYears: math.usefulYears,
        },
      });
    }

    opening = math.totalBalance;
  }

  return {
    recordCount: records.length,
    openingAmount: roundMoney(setup.openingAmount),
    totalPurchaseValue,
    totalSaleBalance,
    totalQuantity,
    totalAnnualDepreciation: totalAnnualDep,
    totalAccumulatedDepreciation: roundMoney(setup.accumulatedDepreciation + totalAnnualDep),
    totalDepreciation,
    totalNetBookValue,
    closingBalance: opening,
  };
}

async function duplicateUpi(
  organizationId: string,
  financialYearId: string,
  upi: string | null,
  excludeId?: string
) {
  if (!upi) return null;
  return prisma.vehicleRecord.findFirst({
    where: {
      organizationId,
      financialYearId,
      upi,
      deletedAt: null,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true, sequence: true },
  });
}

export async function createVehicleRecord(
  organizationId: string,
  input: VehicleRecordInput & { year: number | string },
  actor?: VehicleActor
) {
  const year = Number(input.year);
  if (!Number.isFinite(year)) throw new AppError(400, "Financial year is required");
  const data = normalizeVehicleInput(input);

  return prisma.$transaction(async (tx) => {
    const fy = await tx.financialYear.findUnique({
      where: { organizationId_year: { organizationId, year } },
    });
    if (!fy) throw new AppError(404, `Financial year ${year} was not found`);

    const setup = await tx.vehicleSetup.findUnique({
      where: { organizationId_financialYearId: { organizationId, financialYearId: fy.id } },
    });
    if (!setup) {
      throw new AppError(
        400,
        `Vehicle Setup is required for ${year}. Set the opening amount before registering vehicles.`
      );
    }

    const duplicate = await duplicateUpi(organizationId, fy.id, data.upi);
    if (duplicate) {
      throw new AppError(409, `A vehicle record with UPI "${data.upi}" already exists for ${year}`);
    }

    const last = await tx.vehicleRecord.findFirst({
      where: { organizationId, financialYearId: fy.id, deletedAt: null },
      orderBy: [{ sequence: "desc" }, { createdAt: "desc" }],
    });
    const sequence = (last?.sequence ?? 0) + 1;
    const opening = roundMoney(last ? last.totalBalance : setup.openingAmount);

    const math = computeVehicleRowMath(
      {
        ...data,
        id: "",
        sequence,
        openingAmount: opening,
        totalBalance: 0,
        accumulatedDepreciation: 0,
        annualDep: 0,
        totalDep: 0,
        netBookValue: 0,
        useSetupDepreciation: data.useSetupDepreciation,
      } as VehicleRow,
      setup,
      opening
    );

    const record = await tx.vehicleRecord.create({
      data: {
        organizationId,
        financialYearId: fy.id,
        year,
        sequence,
        ...data,
        openingAmount: math.openingAmount,
        totalBalance: math.totalBalance,
        accumulatedDepreciation: math.accumulatedDepreciation,
        annualDep: math.annualDep,
        totalDep: math.totalDep,
        netBookValue: math.netBookValue,
        depRate: math.depRate,
        depMode: math.depMode,
        usefulYears: math.usefulYears,
        createdByUserId: actor?.userId ?? null,
        createdByEmail: actor?.email ?? null,
      },
    });

    await tx.vehicleAuditLog.create({
      data: {
        organizationId,
        vehicleRecordId: record.id,
        financialYearId: fy.id,
        year,
        action: "create",
        detail: `Vehicle record #${sequence} created`,
        metadata: {
          previous: null,
          next: {
            name: data.name,
            purchaseUnitPrice: data.purchaseUnitPrice,
            saleBalance: data.saleBalance,
            openingAmount: math.openingAmount,
            totalBalance: math.totalBalance,
            depreciationRate: math.depRate,
          },
        },
        actorUserId: actor?.userId ?? null,
        actorEmail: actor?.email ?? null,
      },
    });

    const chain = await recalcVehicleChain(tx, organizationId, fy.id, setup);
    const saved = await tx.vehicleRecord.findUniqueOrThrow({ where: { id: record.id } });
    return { ...serializeVehicle(saved), chain };
  });
}

const SORTABLE_FIELDS = new Set([
  "sequence",
  "location",
  "name",
  "label",
  "vehicleType",
  "category",
  "supplier",
  "upi",
  "sku",
  "purchaseDate",
  "purchaseYear",
  "purchaseUnitPrice",
  "saleBalance",
  "openingAmount",
  "totalBalance",
  "accumulatedDepreciation",
  "annualDep",
  "totalDep",
  "netBookValue",
  "depRate",
  "quantity",
  "createdAt",
]);

export async function listVehicleRecords(
  organizationId: string,
  params: {
    page?: number;
    limit?: number;
    filters?: VehicleListFilters;
  }
) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(500, Math.max(1, Number(params.limit) || 10));
  const filters = params.filters ?? {};

  const where: Record<string, unknown> = { organizationId, deletedAt: null };
  if (filters.year) where.year = Number(filters.year);
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
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { label: { contains: q, mode: "insensitive" } },
      { upi: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
      { supplier: { contains: q, mode: "insensitive" } },
      { vehicleType: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
      { material: { contains: q, mode: "insensitive" } },
    ];
  }

  const sortBy = filters.sortBy && SORTABLE_FIELDS.has(filters.sortBy) ? filters.sortBy : "sequence";
  const sortDir = filters.sortDir === "desc" ? "desc" : "asc";
  const orderBy =
    sortBy === "sequence"
      ? [{ sequence: sortDir }, { createdAt: "asc" as const }]
      : [{ [sortBy]: sortDir }, { sequence: "asc" as const }];

  const [total, rows, aggregate] = await Promise.all([
    prisma.vehicleRecord.count({ where: where as never }),
    prisma.vehicleRecord.findMany({
      where: where as never,
      orderBy: orderBy as never,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.vehicleRecord.aggregate({
      where: where as never,
      _sum: {
        purchaseUnitPrice: true,
        saleBalance: true,
        quantity: true,
        annualDep: true,
        totalDep: true,
        netBookValue: true,
      },
    }),
  ]);

  return {
    success: true,
    data: rows.map((row) => serializeVehicle(row)),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    summary: {
      totalPurchaseValue: roundMoney(aggregate._sum.purchaseUnitPrice ?? 0),
      totalSaleBalance: roundMoney(aggregate._sum.saleBalance ?? 0),
      totalQuantity: aggregate._sum.quantity ?? 0,
      totalAnnualDepreciation: roundMoney(aggregate._sum.annualDep ?? 0),
      totalDepreciation: roundMoney(aggregate._sum.totalDep ?? 0),
      totalNetBookValue: roundMoney(aggregate._sum.netBookValue ?? 0),
    },
  };
}

export async function getVehicleRecord(organizationId: string, id: string) {
  const record = await prisma.vehicleRecord.findFirst({
    where: { id, organizationId, deletedAt: null },
    include: { financialYear: { select: { year: true, status: true } } },
  });
  if (!record) throw new AppError(404, "Vehicle record not found");

  const [previous, next] = await Promise.all([
    prisma.vehicleRecord.findFirst({
      where: {
        organizationId,
        financialYearId: record.financialYearId,
        deletedAt: null,
        sequence: { lt: record.sequence },
      },
      orderBy: { sequence: "desc" },
      select: { id: true, sequence: true, name: true, upi: true, totalBalance: true },
    }),
    prisma.vehicleRecord.findFirst({
      where: {
        organizationId,
        financialYearId: record.financialYearId,
        deletedAt: null,
        sequence: { gt: record.sequence },
      },
      orderBy: { sequence: "asc" },
      select: { id: true, sequence: true, name: true, upi: true, openingAmount: true },
    }),
  ]);

  return {
    ...serializeVehicle(record),
    previous,
    next,
    calculation: {
      previousBalance: record.openingAmount,
      purchaseUnitPrice: record.purchaseUnitPrice,
      saleBalance: record.saleBalance,
      totalBalance: roundMoney(
        record.openingAmount + record.purchaseUnitPrice - record.saleBalance
      ),
      accumulatedDepreciation: record.accumulatedDepreciation,
      annualDep: record.annualDep,
      totalDep: record.totalDep,
      netBookValue: record.netBookValue,
      formula: "Opening Amount + Purchase Unit Price - Sale Balance = Total Balance",
    },
    lastCalculatedAt: record.updatedAt,
  };
}

function auditChanges(
  previous: {
    purchaseUnitPrice: number;
    saleBalance: number;
    depRate: number;
    depMode: string;
    usefulYears: number;
    quantity: number;
    openingAmount: number;
    totalBalance: number;
  },
  next: {
    purchaseUnitPrice: number;
    saleBalance: number;
    depRate: number;
    depMode: string;
    usefulYears: number;
    quantity: number;
  }
) {
  const changes: Record<string, { previous: unknown; next: unknown }> = {};
  if (roundMoney(previous.purchaseUnitPrice) !== roundMoney(next.purchaseUnitPrice)) {
    changes.purchaseUnitPrice = { previous: previous.purchaseUnitPrice, next: next.purchaseUnitPrice };
  }
  if (roundMoney(previous.saleBalance) !== roundMoney(next.saleBalance)) {
    changes.saleBalance = { previous: previous.saleBalance, next: next.saleBalance };
  }
  if (roundMoney(previous.depRate) !== roundMoney(next.depRate)) {
    changes.depreciationRate = { previous: previous.depRate, next: next.depRate };
  }
  if (previous.depMode !== next.depMode) {
    changes.depreciationMode = { previous: previous.depMode, next: next.depMode };
  }
  if (previous.usefulYears !== next.usefulYears) {
    changes.usefulYears = { previous: previous.usefulYears, next: next.usefulYears };
  }
  if (previous.quantity !== next.quantity) {
    changes.quantity = { previous: previous.quantity, next: next.quantity };
  }
  return changes;
}

export async function updateVehicleRecord(
  organizationId: string,
  id: string,
  input: VehicleRecordInput,
  actor?: VehicleActor
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.vehicleRecord.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "Vehicle record not found");

    const data = normalizeVehicleInput(input, existing);

    if (existing.upi !== data.upi) {
      const duplicate = await duplicateUpi(organizationId, existing.financialYearId, data.upi, id);
      if (duplicate) {
        throw new AppError(
          409,
          `A vehicle record with UPI "${data.upi}" already exists for ${existing.year}`
        );
      }
    }

    await tx.vehicleRecord.update({
      where: { id },
      data: {
        ...data,
        updatedByUserId: actor?.userId ?? null,
        updatedByEmail: actor?.email ?? null,
      },
    });

    const setup = await tx.vehicleSetup.findUnique({
      where: {
        organizationId_financialYearId: {
          organizationId,
          financialYearId: existing.financialYearId,
        },
      },
    });
    if (!setup) throw new AppError(400, `Vehicle Setup is required for ${existing.year}`);

    const chain = await recalcVehicleChain(tx, organizationId, existing.financialYearId, setup);
    const updated = await tx.vehicleRecord.findUniqueOrThrow({ where: { id } });

    const changes = auditChanges(existing, data);
    const hasPurchasePriceChange = Boolean(changes.purchaseUnitPrice);
    const hasSaleChange = Boolean(changes.saleBalance);
    const hasDepChange = Boolean(
      changes.depreciationRate || changes.depreciationMode || changes.usefulYears
    );

    const auditRows: Prisma.VehicleAuditLogCreateManyInput[] = [];
    const base = {
      organizationId,
      vehicleRecordId: id,
      financialYearId: existing.financialYearId,
      year: existing.year,
      actorUserId: actor?.userId ?? null,
      actorEmail: actor?.email ?? null,
    };

    if (hasSaleChange) {
      auditRows.push({
        ...base,
        action: "sale_balance_change",
        detail: `Sale balance changed from ${existing.saleBalance} to ${data.saleBalance}`,
        metadata: {
          previous: existing.saleBalance,
          next: data.saleBalance,
          previousTotalBalance: existing.totalBalance,
          newTotalBalance: updated.totalBalance,
        } as Prisma.InputJsonValue,
      });
    }
    if (hasPurchasePriceChange) {
      auditRows.push({
        ...base,
        action: "purchase_price_change",
        detail: `Purchase unit price changed from ${existing.purchaseUnitPrice} to ${data.purchaseUnitPrice}`,
        metadata: {
          previous: existing.purchaseUnitPrice,
          next: data.purchaseUnitPrice,
          previousTotalBalance: existing.totalBalance,
          newTotalBalance: updated.totalBalance,
        } as Prisma.InputJsonValue,
      });
    }
    if (hasDepChange) {
      auditRows.push({
        ...base,
        action: "depreciation_config_change",
        detail: "Vehicle depreciation configuration updated",
        metadata: {
          previous: {
            mode: existing.depMode,
            rate: existing.depRate,
            usefulYears: existing.usefulYears,
          },
          next: {
            mode: data.depMode,
            rate: data.depRate,
            usefulYears: data.usefulYears,
          },
        } as Prisma.InputJsonValue,
      });
    }
    if (auditRows.length === 0) {
      auditRows.push({
        ...base,
        action: "update",
        detail: `Vehicle record #${existing.sequence} updated`,
        metadata: { fields: Object.keys(changes) } as Prisma.InputJsonValue,
      });
    }

    const financialChanged =
      hasPurchasePriceChange || hasSaleChange || hasDepChange || changes.quantity !== undefined;
    if (financialChanged) {
      auditRows.push({
        ...base,
        action: "recalculate",
        detail: `Subsequent vehicle balances recalculated (${chain.recordCount} record(s))`,
        metadata: {
          previousClosingBalance: existing.totalBalance,
          newClosingBalance: chain.closingBalance,
          affectedRecords: chain.recordCount,
        } as Prisma.InputJsonValue,
      });
    }

    await tx.vehicleAuditLog.createMany({ data: auditRows });

    return { ...serializeVehicle(updated), chain, changed: changes };
  });
}

export async function deleteVehicleRecord(
  organizationId: string,
  id: string,
  actor?: VehicleActor
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.vehicleRecord.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "Vehicle record not found");

    await tx.vehicleRecord.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedByUserId: actor?.userId ?? null,
        updatedByEmail: actor?.email ?? null,
      },
    });

    const setup = await tx.vehicleSetup.findUnique({
      where: {
        organizationId_financialYearId: {
          organizationId,
          financialYearId: existing.financialYearId,
        },
      },
    });
    const chain = await recalcVehicleChain(
      tx,
      organizationId,
      existing.financialYearId,
      setup ?? {
        openingAmount: 0,
        accumulatedDepreciation: 0,
        depreciationRate: 0,
        depreciationMode: "Diminishing",
        usefulYears: 0,
      }
    );

    await tx.vehicleAuditLog.create({
      data: {
        organizationId,
        financialYearId: existing.financialYearId,
        year: existing.year,
        action: "delete",
        detail: `Vehicle record #${existing.sequence} deleted`,
        metadata: {
          previous: {
            name: existing.name,
            upi: existing.upi,
            purchaseUnitPrice: existing.purchaseUnitPrice,
            saleBalance: existing.saleBalance,
            totalBalance: existing.totalBalance,
          },
          newClosingBalance: chain.closingBalance,
          affectedRecords: chain.recordCount,
        } as Prisma.InputJsonValue,
        actorUserId: actor?.userId ?? null,
        actorEmail: actor?.email ?? null,
      },
    });

    return { success: true, id, chain };
  });
}

export async function recalcVehicleYear(organizationId: string, year: number) {
  const fy = await requireFinancialYear(organizationId, year);
  const setup = await requireVehicleSetup(organizationId, fy.id, year);
  return prisma.$transaction((tx) => recalcVehicleChain(tx, organizationId, fy.id, setup));
}

export async function listVehicleAuditLogs(
  organizationId: string,
  year?: number,
  limit = 100,
  recordId?: string
) {
  return prisma.vehicleAuditLog.findMany({
    where: {
      organizationId,
      ...(year ? { year: Number(year) } : {}),
      ...(recordId ? { vehicleRecordId: recordId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(500, Math.max(1, limit)),
  });
}
