import { createHash } from "crypto";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";
import {
  LandActor,
  LandRecordInput,
  normalizeLandInput,
  requireFinancialYear,
  roundMoney,
} from "./land.service";

type RawRow = Record<string, unknown>;

export const LAND_IMPORT_COLUMNS = [
  "PROVINCE",
  "DISTRICT",
  "SECTOR",
  "CELLULE",
  "VILLAGE",
  "type",
  "category",
  "supplier",
  "tax",
  "upi",
  "sku",
  "size",
  "material",
  "purchase_year",
  "purchase_month",
  "purchase_day",
  "purchase_unit_price",
] as const;

function pick(row: RawRow, names: string[]): unknown {
  const wanted = new Set(names.map((n) => n.trim().toLowerCase()));
  for (const [key, value] of Object.entries(row)) {
    if (wanted.has(key.trim().toLowerCase())) return value;
  }
  return undefined;
}

function toInput(row: RawRow): LandRecordInput {
  return {
    province: pick(row, ["PROVINCE", "province"]) as string | undefined,
    district: pick(row, ["DISTRICT", "district"]) as string | undefined,
    sector: pick(row, ["SECTOR", "sector"]) as string | undefined,
    cellule: pick(row, ["CELLULE", "cellule"]) as string | undefined,
    village: pick(row, ["VILLAGE", "village"]) as string | undefined,
    type: pick(row, ["type", "TYPE", "land_type"]) as string | undefined,
    category: pick(row, ["category", "CATEGORY"]) as string | undefined,
    supplier: pick(row, ["supplier", "SUPPLIER"]) as string | undefined,
    tax: pick(row, ["tax", "TAX"]) as string | number | undefined,
    upi: pick(row, ["upi", "UPI"]) as string | undefined,
    sku: pick(row, ["sku", "SKU"]) as string | undefined,
    size: pick(row, ["size", "SIZE"]) as string | number | undefined,
    material: pick(row, ["material", "MATERIAL"]) as string | undefined,
    purchase_year: pick(row, ["purchase_year", "PURCHASE_YEAR"]) as string | number | undefined,
    purchase_month: pick(row, ["purchase_month", "PURCHASE_MONTH"]) as string | number | undefined,
    purchase_day: pick(row, ["purchase_day", "PURCHASE_DAY"]) as string | number | undefined,
    purchase_unit_price: pick(row, [
      "purchase_unit_price",
      "PURCHASE_UNIT_PRICE",
      "PURCHASE PRICE",
      "purchase price",
    ]) as string | number,
  };
}

function isBlankRow(row: RawRow): boolean {
  return Object.values(row).every(
    (value) => value === undefined || value === null || String(value).trim() === ""
  );
}

function rowKey(data: { upi: string | null; sku: string | null }): string | null {
  if (data.upi) return `upi:${data.upi.toLowerCase()}`;
  if (data.sku) return `sku:${data.sku.toLowerCase()}`;
  return null;
}

function fingerprintFor(year: number, rows: Array<Record<string, unknown>>): string {
  return createHash("sha256")
    .update(JSON.stringify({ year, rows }))
    .digest("hex");
}

type PreparedRow = {
  row: number;
  status: "valid" | "invalid" | "duplicate";
  errors: string[];
  data: ReturnType<typeof normalizeLandInput> | null;
  source: RawRow;
};

async function prepareRows(
  organizationId: string,
  year: number,
  financialYearId: string,
  rawRows: RawRow[]
) {
  const setup = await prisma.landSetup.findUnique({
    where: { organizationId_financialYearId: { organizationId, financialYearId } },
  });
  if (!setup) {
    throw new AppError(
      400,
      `Land Setup is required for ${year}. Set the opening amount before importing land.`
    );
  }

  const existing = await prisma.landRecord.findMany({
    where: { organizationId, financialYearId, deletedAt: null },
    select: { upi: true, sku: true },
  });
  const existingKeys = new Set<string>();
  for (const record of existing) {
    if (record.upi) existingKeys.add(`upi:${record.upi.toLowerCase()}`);
    if (record.sku) existingKeys.add(`sku:${record.sku.toLowerCase()}`);
  }

  const lastRecord = await prisma.landRecord.findFirst({
    where: { organizationId, financialYearId, deletedAt: null },
    orderBy: [{ sequence: "desc" }, { createdAt: "desc" }],
    select: { totalBalance: true },
  });

  const seenKeys = new Set<string>();
  const prepared: PreparedRow[] = [];

  rawRows.forEach((source, index) => {
    const rowNumber = index + 2; // header occupies row 1
    if (isBlankRow(source)) {
      prepared.push({ row: rowNumber, status: "invalid", errors: ["Row is empty"], data: null, source });
      return;
    }

    try {
      const data = normalizeLandInput(toInput(source));
      const key = rowKey(data);
      const errors: string[] = [];

      if (key && existingKeys.has(key)) {
        errors.push(
          data.upi
            ? `UPI "${data.upi}" already exists in this financial year`
            : `SKU "${data.sku}" already exists in this financial year`
        );
      }
      if (key && seenKeys.has(key)) {
        errors.push("Duplicate row inside this file");
      }
      if (key) seenKeys.add(key);

      prepared.push({
        row: rowNumber,
        status: errors.length > 0 ? "duplicate" : "valid",
        errors,
        data,
        source,
      });
    } catch (error) {
      prepared.push({
        row: rowNumber,
        status: "invalid",
        errors: [error instanceof AppError ? error.message : "Row could not be parsed"],
        data: null,
        source,
      });
    }
  });

  const valid = prepared.filter((r) => r.status === "valid" && r.data);
  let running = roundMoney(lastRecord?.totalBalance ?? setup.openingAmount);
  let totalPurchaseValue = 0;
  const previewRows = prepared.map((item) => {
    if (item.status !== "valid" || !item.data) {
      return {
        row: item.row,
        status: item.status,
        errors: item.errors,
        data: item.data,
        openingAmount: null,
        purchaseUnitPrice: item.data?.purchaseUnitPrice ?? null,
        totalBalance: null,
      };
    }
    const openingAmount = running;
    const totalBalance = roundMoney(openingAmount + item.data.purchaseUnitPrice);
    running = totalBalance;
    totalPurchaseValue = roundMoney(totalPurchaseValue + item.data.purchaseUnitPrice);
    return {
      row: item.row,
      status: item.status,
      errors: item.errors,
      data: item.data,
      openingAmount,
      purchaseUnitPrice: item.data.purchaseUnitPrice,
      totalBalance,
    };
  });

  const duplicateCount = prepared.filter((r) => r.status === "duplicate").length;
  const invalidCount = prepared.filter((r) => r.status === "invalid").length;

  return {
    setup,
    prepared,
    previewRows,
    summary: {
      total: rawRows.length,
      valid: valid.length,
      invalid: invalidCount,
      duplicates: duplicateCount,
      year,
      openingAmount: roundMoney(setup.openingAmount),
      totalPurchaseValue,
      expectedTotalBalance: running,
      canImport: valid.length > 0 && invalidCount === 0 && duplicateCount === 0,
    },
  };
}

export async function previewLandImport(
  organizationId: string,
  input: { year: number | string; rows?: RawRow[] }
) {
  const year = Number(input.year);
  if (!Number.isFinite(year)) throw new AppError(400, "Financial year is required");
  const rows = Array.isArray(input.rows) ? input.rows : [];
  if (rows.length === 0) throw new AppError(400, "No rows were found in the uploaded file");

  const fy = await requireFinancialYear(organizationId, year);
  const prepared = await prepareRows(organizationId, year, fy.id, rows);

  return {
    summary: prepared.summary,
    rows: prepared.previewRows,
  };
}

export async function commitLandImport(
  organizationId: string,
  input: { year: number | string; rows?: RawRow[]; fileName?: string },
  actor?: LandActor
) {
  const year = Number(input.year);
  if (!Number.isFinite(year)) throw new AppError(400, "Financial year is required");
  const rows = Array.isArray(input.rows) ? input.rows : [];
  if (rows.length === 0) throw new AppError(400, "No rows were found in the uploaded file");

  const fy = await requireFinancialYear(organizationId, year);
  const prepared = await prepareRows(organizationId, year, fy.id, rows);

  const canonicalRows = prepared.prepared
    .map((r) => r.data)
    .filter((data): data is NonNullable<typeof data> => Boolean(data));
  const fingerprint = fingerprintFor(year, canonicalRows as Array<Record<string, unknown>>);

  const alreadyImported = await prisma.landImportBatch.findFirst({
    where: { organizationId, financialYearId: fy.id, fingerprint },
    orderBy: { createdAt: "desc" },
  });
  if (alreadyImported) {
    throw new AppError(
      409,
      `This exact file was already imported for ${year} on ${alreadyImported.createdAt.toISOString().slice(0, 10)}.`
    );
  }

  if (prepared.summary.invalid > 0 || prepared.summary.duplicates > 0) {
    throw new AppError(
      400,
      `Import blocked: ${prepared.summary.invalid} invalid and ${prepared.summary.duplicates} duplicate row(s). Fix the file and preview again.`
    );
  }
  if (prepared.summary.valid === 0) {
    throw new AppError(400, "There are no valid rows to import");
  }

  const validRows = prepared.prepared.filter((r) => r.status === "valid" && r.data);

  return prisma.$transaction(async (tx) => {
    const setup = await tx.landSetup.findUnique({
      where: { organizationId_financialYearId: { organizationId, financialYearId: fy.id } },
    });
    if (!setup) throw new AppError(400, `Land Setup is required for ${year}`);

    const last = await tx.landRecord.findFirst({
      where: { organizationId, financialYearId: fy.id, deletedAt: null },
      orderBy: [{ sequence: "desc" }, { createdAt: "desc" }],
    });

    let sequence = last?.sequence ?? 0;
    let openingAmount = last?.totalBalance ?? setup.openingAmount;
    let totalPurchaseValue = 0;

    const batch = await tx.landImportBatch.create({
      data: {
        organizationId,
        financialYearId: fy.id,
        year,
        fileName: input.fileName ?? null,
        fingerprint,
        rowCount: validRows.length,
        openingAmount: roundMoney(setup.openingAmount),
        status: "Completed",
        createdByUserId: actor?.userId ?? null,
        createdByEmail: actor?.email ?? null,
      },
    });

    for (const item of validRows) {
      const data = item.data!;
      const totalBalance = roundMoney(openingAmount + data.purchaseUnitPrice);
      sequence += 1;
      totalPurchaseValue = roundMoney(totalPurchaseValue + data.purchaseUnitPrice);

      await tx.landRecord.create({
        data: {
          organizationId,
          financialYearId: fy.id,
          year,
          sequence,
          ...data,
          openingAmount,
          totalBalance,
          importBatchId: batch.id,
          createdByUserId: actor?.userId ?? null,
          createdByEmail: actor?.email ?? null,
        },
      });

      openingAmount = totalBalance;
    }

    await tx.landImportBatch.update({
      where: { id: batch.id },
      data: {
        openingAmount: roundMoney(setup.openingAmount),
        totalPurchaseValue,
        closingBalance: openingAmount,
      },
    });

    await tx.landAuditLog.create({
      data: {
        organizationId,
        financialYearId: fy.id,
        year,
        action: "import",
        detail: `Imported ${validRows.length} land record(s)`,
        metadata: {
          batchId: batch.id,
          fileName: input.fileName ?? null,
          rowCount: validRows.length,
          totalPurchaseValue,
          closingBalance: openingAmount,
        },
        actorUserId: actor?.userId ?? null,
        actorEmail: actor?.email ?? null,
      },
    });

    return {
      batchId: batch.id,
      imported: validRows.length,
      openingAmount: roundMoney(setup.openingAmount),
      totalPurchaseValue,
      closingBalance: openingAmount,
    };
  });
}

export async function listLandImportBatches(organizationId: string, year?: number) {
  return prisma.landImportBatch.findMany({
    where: { organizationId, ...(year ? { year: Number(year) } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
