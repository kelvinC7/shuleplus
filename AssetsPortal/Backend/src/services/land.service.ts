import { Prisma } from "../generated/prisma";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";
import { getModuleActiveYear, resolveModuleActiveYear } from "./module-year.service";

/**
 * Independent Land asset module.
 *
 * Land is intentionally isolated from the generic register: it has its own
 * setup table, its own records and its own sequential balance chain. Nothing
 * here mutates `asset_register` or depreciation for other categories.
 */

export type LandActor = {
  userId?: string | null;
  email?: string | null;
};

export type LandRecordInput = {
  province?: string | null;
  district?: string | null;
  sector?: string | null;
  cellule?: string | null;
  village?: string | null;
  type?: string | null;
  category?: string | null;
  supplier?: string | null;
  tax?: string | number | null;
  upi?: string | null;
  sku?: string | null;
  sku_mode?: string | null;
  size?: string | number | null;
  material?: string | null;
  purchase_year?: number | string | null;
  purchase_month?: number | string | null;
  purchase_day?: number | string | null;
  purchase_unit_price: number | string;
};

export type LandListFilters = {
  year?: number;
  province?: string;
  district?: string;
  sector?: string;
  category?: string;
  supplier?: string;
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

function optionalInt(value: unknown, label: string): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new AppError(400, `${label} must be a whole number`);
  }
  return n;
}

function parseSize(value: unknown): { size: string | null; sizeValue: number | null } {
  const raw = cleanText(value);
  if (!raw) return { size: null, sizeValue: null };
  const match = raw.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  const numeric = match ? Number(match[0]) : NaN;
  return { size: raw, sizeValue: Number.isFinite(numeric) ? roundMoney(numeric) : null };
}

function parsePrice(value: unknown): number {
  if (value === undefined || value === null || value === "") {
    throw new AppError(400, "Purchase unit price is required");
  }
  const n = typeof value === "string" ? Number(value.replace(/,/g, "").trim()) : Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new AppError(400, "Purchase unit price must be a valid positive number");
  }
  return roundMoney(n);
}

export function buildPurchaseDate(
  year: number | null,
  month: number | null,
  day: number | null
): Date | null {
  if (!year) return null;
  if (!month) return null;
  const m = month;
  const d = day ?? 1;
  if (m < 1 || m > 12) throw new AppError(400, "purchase_month must be between 1 and 12");
  if (d < 1 || d > 31) throw new AppError(400, "purchase_day must be between 1 and 31");
  const date = new Date(Date.UTC(year, m - 1, d));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    throw new AppError(400, `Invalid purchase date ${year}-${m}-${d}`);
  }
  return date;
}

export function normalizeLandInput(input: LandRecordInput) {
  const purchaseYear = optionalInt(input.purchase_year, "purchase_year");
  const purchaseMonth = optionalInt(input.purchase_month, "purchase_month");
  const purchaseDay = optionalInt(input.purchase_day, "purchase_day");

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

  const { size, sizeValue } = parseSize(input.size);

  return {
    province: cleanText(input.province),
    district: cleanText(input.district),
    sector: cleanText(input.sector),
    cellule: cleanText(input.cellule),
    village: cleanText(input.village),
    landType: cleanText(input.type),
    category: cleanText(input.category),
    supplier: cleanText(input.supplier),
    tax: cleanText(input.tax),
    upi: cleanText(input.upi),
    sku: cleanText(input.sku),
    size,
    sizeValue,
    material: cleanText(input.material),
    purchaseYear,
    purchaseMonth,
    purchaseDay,
    purchaseDate: buildPurchaseDate(purchaseYear, purchaseMonth, purchaseDay),
    purchaseUnitPrice: parsePrice(input.purchase_unit_price),
  };
}

function generateLandSku(year: number, sequence: number): string {
  return `LAND-${year}-${String(sequence).padStart(4, "0")}`;
}

function resolveLandSkuMode(
  requested: string | null | undefined,
  hasManualSku: boolean
): "auto" | "manual" {
  const value = String(requested ?? "").trim().toLowerCase();
  if (value === "manual" || value === "auto") return value;
  return hasManualSku ? "manual" : "auto";
}

export async function requireFinancialYear(organizationId: string, year: number) {
  const fy = await prisma.financialYear.findUnique({
    where: { organizationId_year: { organizationId, year } },
  });
  if (!fy) throw new AppError(404, `Financial year ${year} was not found for this organization`);
  return fy;
}

export async function getLandMeta(organizationId: string) {
  const [years, setupRows, aggregates, moduleActiveYear] = await Promise.all([
    prisma.financialYear.findMany({
      where: { organizationId },
      orderBy: { year: "desc" },
      include: { landSetups: true, landImportBatches: { orderBy: { createdAt: "desc" } } },
    }),
    prisma.landSetup.findMany({ where: { organizationId } }),
    prisma.landRecord.groupBy({
      by: ["province", "district", "sector", "category", "supplier"],
      where: { organizationId, deletedAt: null },
      _count: { _all: true },
    }),
    getModuleActiveYear(organizationId, "land"),
  ]);

  const distinct = (values: Array<string | null>) =>
    Array.from(new Set(values.filter((v): v is string => Boolean(v && v.trim())))).sort((a, b) =>
      a.localeCompare(b)
    );

  const setupByYear = new Map(setupRows.map((s) => [s.year, s]));
  const batchByYear = new Map<number, (typeof years)[number]["landImportBatches"]>();
  for (const fy of years) batchByYear.set(fy.year, fy.landImportBatches);

  return {
    years: years.map((fy) => {
      const setup = setupByYear.get(fy.year) ?? null;
      return {
        id: fy.id,
        year: fy.year,
        startDate: fy.startDate,
        endDate: fy.endDate,
        status: fy.status,
        setup: setup
          ? { id: setup.id, openingAmount: setup.openingAmount, updatedAt: setup.updatedAt }
          : null,
        importCount: batchByYear.get(fy.year)?.length ?? 0,
      };
    }),
    activeYear: resolveModuleActiveYear(moduleActiveYear, years),
    provinces: distinct(aggregates.map((a) => a.province)),
    districts: distinct(aggregates.map((a) => a.district)),
    sectors: distinct(aggregates.map((a) => a.sector)),
    categories: distinct(aggregates.map((a) => a.category)),
    suppliers: distinct(aggregates.map((a) => a.supplier)),
  };
}

export async function getLandSetup(organizationId: string, year: number) {
  const fy = await requireFinancialYear(organizationId, year);
  const [setup, aggregate, last] = await Promise.all([
    prisma.landSetup.findUnique({
      where: { organizationId_financialYearId: { organizationId, financialYearId: fy.id } },
    }),
    prisma.landRecord.aggregate({
      where: { organizationId, financialYearId: fy.id, deletedAt: null },
      _count: { _all: true },
      _sum: { purchaseUnitPrice: true, sizeValue: true },
    }),
    prisma.landRecord.findFirst({
      where: { organizationId, financialYearId: fy.id, deletedAt: null },
      orderBy: [{ sequence: "desc" }, { createdAt: "desc" }],
      select: { totalBalance: true },
    }),
  ]);

  const openingAmount = setup?.openingAmount ?? 0;
  return {
    id: setup?.id ?? null,
    organizationId,
    financialYearId: fy.id,
    year: fy.year,
    configured: Boolean(setup),
    openingAmount,
    recordCount: aggregate._count._all,
    totalPurchaseValue: roundMoney(aggregate._sum.purchaseUnitPrice ?? 0),
    totalSize: roundMoney(aggregate._sum.sizeValue ?? 0),
    closingBalance: setup ? last?.totalBalance ?? openingAmount : 0,
    updatedAt: setup?.updatedAt ?? null,
  };
}

export async function upsertLandSetup(
  organizationId: string,
  input: { year: number | string; opening_amount: number | string },
  actor?: LandActor
) {
  const year = Number(input.year);
  if (!Number.isFinite(year)) throw new AppError(400, "Financial year is required");
  const openingAmount = Number(
    typeof input.opening_amount === "string"
      ? input.opening_amount.replace(/,/g, "").trim()
      : input.opening_amount
  );
  if (!Number.isFinite(openingAmount) || openingAmount < 0) {
    throw new AppError(400, "Opening amount must be a valid positive number");
  }

  await prisma.$transaction(async (tx) => {
    const fy = await tx.financialYear.findUnique({
      where: { organizationId_year: { organizationId, year } },
    });
    if (!fy) throw new AppError(404, `Financial year ${year} was not found`);

    const existing = await tx.landSetup.findUnique({
      where: { organizationId_financialYearId: { organizationId, financialYearId: fy.id } },
    });

    const setup = existing
      ? await tx.landSetup.update({
          where: { id: existing.id },
          data: { openingAmount: roundMoney(openingAmount) },
        })
      : await tx.landSetup.create({
          data: {
            organizationId,
            financialYearId: fy.id,
            year,
            openingAmount: roundMoney(openingAmount),
            createdByUserId: actor?.userId ?? null,
            createdByEmail: actor?.email ?? null,
          },
        });

    await recalcLandChain(tx, organizationId, fy.id, setup.openingAmount);

    await tx.landAuditLog.create({
      data: {
        organizationId,
        financialYearId: fy.id,
        year,
        action: existing ? "setup_update" : "setup_create",
        detail: existing
          ? `Land opening amount changed to ${setup.openingAmount}`
          : `Land opening amount set to ${setup.openingAmount}`,
        metadata: { openingAmount: setup.openingAmount, previous: existing?.openingAmount ?? null },
        actorUserId: actor?.userId ?? null,
        actorEmail: actor?.email ?? null,
      },
    });

    return setup.id;
  });

  return getLandSetup(organizationId, year);
}

type Tx = Prisma.TransactionClient;

export async function recalcLandChain(
  tx: Tx,
  organizationId: string,
  financialYearId: string,
  openingAmount: number
) {
  const records = await tx.landRecord.findMany({
    where: { organizationId, financialYearId, deletedAt: null },
    orderBy: [{ sequence: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });

  let opening = roundMoney(openingAmount);
  let totalPurchaseValue = 0;

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const total = roundMoney(opening + record.purchaseUnitPrice);
    totalPurchaseValue = roundMoney(totalPurchaseValue + record.purchaseUnitPrice);

    if (
      record.sequence !== index + 1 ||
      roundMoney(record.openingAmount) !== opening ||
      roundMoney(record.totalBalance) !== total
    ) {
      await tx.landRecord.update({
        where: { id: record.id },
        data: { sequence: index + 1, openingAmount: opening, totalBalance: total },
      });
    }
    opening = total;
  }

  return {
    recordCount: records.length,
    totalPurchaseValue,
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
  return prisma.landRecord.findFirst({
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

export async function createLandRecord(
  organizationId: string,
  input: LandRecordInput & { year: number | string },
  actor?: LandActor
) {
  const year = Number(input.year);
  if (!Number.isFinite(year)) throw new AppError(400, "Financial year is required");
  const data = normalizeLandInput(input);
  const skuMode = resolveLandSkuMode(input.sku_mode, Boolean(data.sku));
  if (skuMode === "manual" && !data.sku) {
    throw new AppError(400, "SKU is required when manual SKU mode is selected");
  }

  return prisma.$transaction(async (tx) => {
    const fy = await tx.financialYear.findUnique({
      where: { organizationId_year: { organizationId, year } },
    });
    if (!fy) throw new AppError(404, `Financial year ${year} was not found`);

    const setup = await tx.landSetup.findUnique({
      where: { organizationId_financialYearId: { organizationId, financialYearId: fy.id } },
    });
    if (!setup) {
      throw new AppError(
        400,
        `Land Setup is required for ${year}. Set the opening amount before registering land.`
      );
    }

    const duplicate = await duplicateUpi(organizationId, fy.id, data.upi);
    if (duplicate) {
      throw new AppError(409, `A land record with UPI "${data.upi}" already exists for ${year}`);
    }

    const last = await tx.landRecord.findFirst({
      where: { organizationId, financialYearId: fy.id, deletedAt: null },
      orderBy: [{ sequence: "desc" }, { createdAt: "desc" }],
    });
    const sequence = (last?.sequence ?? 0) + 1;
    const openingAmount = last ? last.totalBalance : setup.openingAmount;
    const totalBalance = roundMoney(openingAmount + data.purchaseUnitPrice);
    const sku = skuMode === "manual" ? data.sku : generateLandSku(year, sequence);

    const record = await tx.landRecord.create({
      data: {
        organizationId,
        financialYearId: fy.id,
        year,
        sequence,
        ...data,
        sku,
        openingAmount,
        totalBalance,
        createdByUserId: actor?.userId ?? null,
        createdByEmail: actor?.email ?? null,
      },
    });

    await tx.landAuditLog.create({
      data: {
        organizationId,
        landRecordId: record.id,
        financialYearId: fy.id,
        year,
        action: "create",
        detail: `Land record #${sequence} created`,
        metadata: { purchaseUnitPrice: data.purchaseUnitPrice, totalBalance },
        actorUserId: actor?.userId ?? null,
        actorEmail: actor?.email ?? null,
      },
    });

    return record;
  });
}

const SORTABLE_FIELDS = new Set([
  "sequence",
  "province",
  "district",
  "sector",
  "category",
  "supplier",
  "upi",
  "sku",
  "sizeValue",
  "purchaseDate",
  "purchaseUnitPrice",
  "openingAmount",
  "totalBalance",
  "createdAt",
]);

export async function listLandRecords(
  organizationId: string,
  params: {
    page?: number;
    limit?: number;
    filters?: LandListFilters;
  }
) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(500, Math.max(1, Number(params.limit) || 10));
  const filters = params.filters ?? {};

  const where: Record<string, unknown> = { organizationId, deletedAt: null };
  if (filters.year) where.year = Number(filters.year);
  for (const key of ["province", "district", "sector", "category", "supplier"] as const) {
    const value = filters[key];
    if (value && value !== "all") {
      where[key] = { equals: value, mode: "insensitive" };
    }
  }
  if (filters.from || filters.to) {
    where.purchaseDate = {
      ...(filters.from ? { gte: new Date(filters.from) } : {}),
      ...(filters.to ? { lte: new Date(filters.to) } : {}),
    };
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { upi: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { province: { contains: q, mode: "insensitive" } },
      { district: { contains: q, mode: "insensitive" } },
      { sector: { contains: q, mode: "insensitive" } },
      { cellule: { contains: q, mode: "insensitive" } },
      { village: { contains: q, mode: "insensitive" } },
      { supplier: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
      { landType: { contains: q, mode: "insensitive" } },
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
    prisma.landRecord.count({ where: where as never }),
    prisma.landRecord.findMany({
      where: where as never,
      orderBy: orderBy as never,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.landRecord.aggregate({
      where: where as never,
      _sum: { purchaseUnitPrice: true, sizeValue: true },
    }),
  ]);

  return {
    success: true,
    data: rows,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    summary: {
      totalPurchaseValue: roundMoney(aggregate._sum.purchaseUnitPrice ?? 0),
      totalSize: roundMoney(aggregate._sum.sizeValue ?? 0),
    },
  };
}

export async function getLandRecord(organizationId: string, id: string) {
  const record = await prisma.landRecord.findFirst({
    where: { id, organizationId, deletedAt: null },
    include: { financialYear: { select: { year: true, status: true } } },
  });
  if (!record) throw new AppError(404, "Land record not found");

  const [previous, next] = await Promise.all([
    prisma.landRecord.findFirst({
      where: {
        organizationId,
        financialYearId: record.financialYearId,
        deletedAt: null,
        sequence: { lt: record.sequence },
      },
      orderBy: { sequence: "desc" },
      select: { id: true, sequence: true, upi: true, totalBalance: true },
    }),
    prisma.landRecord.findFirst({
      where: {
        organizationId,
        financialYearId: record.financialYearId,
        deletedAt: null,
        sequence: { gt: record.sequence },
      },
      orderBy: { sequence: "asc" },
      select: { id: true, sequence: true, upi: true, openingAmount: true },
    }),
  ]);

  return {
    ...record,
    previous,
    next,
    calculation: {
      previousBalance: record.openingAmount,
      purchaseUnitPrice: record.purchaseUnitPrice,
      totalBalance: roundMoney(record.openingAmount + record.purchaseUnitPrice),
    },
  };
}

export async function updateLandRecord(
  organizationId: string,
  id: string,
  input: LandRecordInput,
  actor?: LandActor
) {
  const data = normalizeLandInput(input);
  const skuMode = resolveLandSkuMode(input.sku_mode, Boolean(data.sku));
  if (skuMode === "manual" && !data.sku) {
    throw new AppError(400, "SKU is required when manual SKU mode is selected");
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.landRecord.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "Land record not found");

    const sku =
      skuMode === "manual"
        ? data.sku
        : (existing.sku ?? generateLandSku(existing.year, existing.sequence));

    if (existing.upi !== data.upi) {
      const duplicate = await duplicateUpi(organizationId, existing.financialYearId, data.upi, id);
      if (duplicate) {
        throw new AppError(
          409,
          `A land record with UPI "${data.upi}" already exists for ${existing.year}`
        );
      }
    }

    const updated = await tx.landRecord.update({
      where: { id },
      data: {
        ...data,
        sku,
        updatedByUserId: actor?.userId ?? null,
        updatedByEmail: actor?.email ?? null,
      },
    });

    const setup = await tx.landSetup.findUnique({
      where: {
        organizationId_financialYearId: {
          organizationId,
          financialYearId: existing.financialYearId,
        },
      },
    });
    const chain = await recalcLandChain(
      tx,
      organizationId,
      existing.financialYearId,
      setup?.openingAmount ?? 0
    );

    await tx.landAuditLog.create({
      data: {
        organizationId,
        landRecordId: id,
        financialYearId: existing.financialYearId,
        year: existing.year,
        action: "update",
        detail: `Land record #${existing.sequence} updated`,
        metadata: {
          previousPrice: existing.purchaseUnitPrice,
          newPrice: data.purchaseUnitPrice,
          closingBalance: chain.closingBalance,
        },
        actorUserId: actor?.userId ?? null,
        actorEmail: actor?.email ?? null,
      },
    });

    return { ...updated, chain };
  });
}

export async function deleteLandRecord(
  organizationId: string,
  id: string,
  actor?: LandActor
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.landRecord.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "Land record not found");

    await tx.landRecord.update({
      where: { id },
      data: { deletedAt: new Date(), updatedByUserId: actor?.userId ?? null, updatedByEmail: actor?.email ?? null },
    });

    const setup = await tx.landSetup.findUnique({
      where: {
        organizationId_financialYearId: {
          organizationId,
          financialYearId: existing.financialYearId,
        },
      },
    });
    const chain = await recalcLandChain(
      tx,
      organizationId,
      existing.financialYearId,
      setup?.openingAmount ?? 0
    );

    await tx.landAuditLog.create({
      data: {
        organizationId,
        financialYearId: existing.financialYearId,
        year: existing.year,
        action: "delete",
        detail: `Land record #${existing.sequence} deleted`,
        metadata: { upi: existing.upi, purchaseUnitPrice: existing.purchaseUnitPrice },
        actorUserId: actor?.userId ?? null,
        actorEmail: actor?.email ?? null,
      },
    });

    return { success: true, id, chain };
  });
}

export async function recalcLandYear(organizationId: string, year: number) {
  const fy = await requireFinancialYear(organizationId, year);
  const setup = await prisma.landSetup.findUnique({
    where: { organizationId_financialYearId: { organizationId, financialYearId: fy.id } },
  });
  if (!setup) throw new AppError(400, `Land Setup is required for ${year}`);
  return prisma.$transaction((tx) =>
    recalcLandChain(tx, organizationId, fy.id, setup.openingAmount)
  );
}

export async function listLandAuditLogs(organizationId: string, year?: number, limit = 100) {
  return prisma.landAuditLog.findMany({
    where: { organizationId, ...(year ? { year: Number(year) } : {}) },
    orderBy: { createdAt: "desc" },
    take: Math.min(500, Math.max(1, limit)),
  });
}
