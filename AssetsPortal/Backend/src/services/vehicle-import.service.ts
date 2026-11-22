import { createHash } from "crypto";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";
import {
  VehicleActor,
  VehicleDepreciationSetup,
  VehicleRecordInput,
  computeVehicleRowMath,
  normalizeVehicleInput,
  requireFinancialYear,
  roundMoney,
} from "./vehicle.service";

type RawRow = Record<string, unknown>;

/**
 * Exact upload template for the independent Vehicle module. Calculated fields
 * (opening, total balance, depreciation, net book value, quantity, ...) must
 * never be part of the template.
 */
export const VEHICLE_IMPORT_COLUMNS = [
  "location",
  "name",
  "label",
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
  "SALE BALANCE",
] as const;

function pick(row: RawRow, names: string[]): unknown {
  const wanted = new Set(names.map((n) => n.trim().toLowerCase()));
  for (const [key, value] of Object.entries(row)) {
    if (wanted.has(key.trim().toLowerCase())) return value;
  }
  return undefined;
}

function toInput(row: RawRow): VehicleRecordInput {
  return {
    location: pick(row, ["location", "LOCATION"]) as string | undefined,
    name: pick(row, ["name", "NAME"]) as string | undefined,
    label: pick(row, ["label", "LABEL"]) as string | undefined,
    type: pick(row, ["type", "TYPE", "vehicle_type"]) as string | undefined,
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
    sale_balance: pick(row, [
      "SALE BALANCE",
      "sale balance",
      "sale_balance",
      "SALE_BALANCE",
      "saleBalance",
    ]) as string | number | undefined,
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
    .update(JSON.stringify({ module: "vehicles", year, rows }))
    .digest("hex");
}

type PreparedRow = {
  row: number;
  status: "valid" | "invalid" | "duplicate";
  errors: string[];
  data: ReturnType<typeof normalizeVehicleInput> | null;
  source: RawRow;
  openingAmount: number | null;
  purchaseUnitPrice: number | null;
  saleBalance: number | null;
  totalBalance: number | null;
  accumulatedDepreciation: number | null;
  annualDep: number | null;
  totalDep: number | null;
  netBookValue: number | null;
};

function setupToMath(setup: {
  openingAmount: number;
  accumulatedDepreciation: number;
  depreciationRate: number;
  depreciationMode: string;
  usefulYears: number;
}): VehicleDepreciationSetup {
  return {
    openingAmount: roundMoney(setup.openingAmount),
    accumulatedDepreciation: roundMoney(setup.accumulatedDepreciation),
    depreciationRate: Number(setup.depreciationRate) || 0,
    depreciationMode: setup.depreciationMode || "Diminishing",
    usefulYears: setup.usefulYears ?? 0,
  };
}

async function prepareRows(
  organizationId: string,
  year: number,
  financialYearId: string,
  rawRows: RawRow[]
) {
  const setup = await prisma.vehicleSetup.findUnique({
    where: { organizationId_financialYearId: { organizationId, financialYearId } },
  });
  if (!setup) {
    throw new AppError(
      400,
      `Vehicle Setup is required for ${year}. Set the opening amount and depreciation configuration before importing vehicles.`
    );
  }

  const existing = await prisma.vehicleRecord.findMany({
    where: { organizationId, financialYearId, deletedAt: null },
    select: { upi: true, sku: true },
  });
  const existingKeys = new Set<string>();
  for (const record of existing) {
    if (record.upi) existingKeys.add(`upi:${record.upi.toLowerCase()}`);
    if (record.sku) existingKeys.add(`sku:${record.sku.toLowerCase()}`);
  }

  const lastRecord = await prisma.vehicleRecord.findFirst({
    where: { organizationId, financialYearId, deletedAt: null },
    orderBy: [{ sequence: "desc" }, { createdAt: "desc" }],
    select: { totalBalance: true },
  });

  const seenKeys = new Set<string>();
  const prepared: PreparedRow[] = [];

  rawRows.forEach((source, index) => {
    const rowNumber = index + 2; // header occupies row 1
    if (isBlankRow(source)) {
      prepared.push({
        row: rowNumber,
        status: "invalid",
        errors: ["Row is empty"],
        data: null,
        source,
        openingAmount: null,
        purchaseUnitPrice: null,
        saleBalance: null,
        totalBalance: null,
        accumulatedDepreciation: null,
        annualDep: null,
        totalDep: null,
        netBookValue: null,
      });
      return;
    }

    try {
      const data = normalizeVehicleInput(toInput(source));
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
        openingAmount: null,
        purchaseUnitPrice: data.purchaseUnitPrice,
        saleBalance: data.saleBalance,
        totalBalance: null,
        accumulatedDepreciation: null,
        annualDep: null,
        totalDep: null,
        netBookValue: null,
      });
    } catch (error) {
      prepared.push({
        row: rowNumber,
        status: "invalid",
        errors: [error instanceof AppError ? error.message : "Row could not be parsed"],
        data: null,
        source,
        openingAmount: null,
        purchaseUnitPrice: null,
        saleBalance: null,
        totalBalance: null,
        accumulatedDepreciation: null,
        annualDep: null,
        totalDep: null,
        netBookValue: null,
      });
    }
  });

  const mathSetup = setupToMath(setup);
  let running = roundMoney(lastRecord?.totalBalance ?? setup.openingAmount);
  const startingOpeningAmount = running;
  let totalPurchaseValue = 0;
  let totalSaleBalance = 0;
  let totalAnnualDepreciation = 0;
  let totalDepreciation = 0;
  let totalNetBookValue = 0;

  const previewRows = prepared.map((item) => {
    if (item.status !== "valid" || !item.data) return item;

    const openingAmount = running;
    const math = computeVehicleRowMath(
      {
        id: "",
        sequence: 0,
        purchaseUnitPrice: item.data.purchaseUnitPrice,
        saleBalance: item.data.saleBalance,
        openingAmount,
        totalBalance: 0,
        accumulatedDepreciation: 0,
        annualDep: 0,
        totalDep: 0,
        netBookValue: 0,
        depRate: item.data.depRate,
        depMode: item.data.depMode,
        usefulYears: item.data.usefulYears,
        useSetupDepreciation: item.data.useSetupDepreciation,
        quantity: item.data.quantity,
      },
      mathSetup,
      openingAmount
    );

    running = math.totalBalance;
    totalPurchaseValue = roundMoney(totalPurchaseValue + item.data.purchaseUnitPrice);
    totalSaleBalance = roundMoney(totalSaleBalance + item.data.saleBalance);
    totalAnnualDepreciation = roundMoney(totalAnnualDepreciation + math.annualDep);
    totalDepreciation = roundMoney(totalDepreciation + math.totalDep);
    totalNetBookValue = roundMoney(totalNetBookValue + math.netBookValue);

    return {
      ...item,
      openingAmount: math.openingAmount,
      purchaseUnitPrice: item.data.purchaseUnitPrice,
      saleBalance: item.data.saleBalance,
      totalBalance: math.totalBalance,
      accumulatedDepreciation: math.accumulatedDepreciation,
      annualDep: math.annualDep,
      totalDep: math.totalDep,
      netBookValue: math.netBookValue,
    };
  });

  const duplicateCount = prepared.filter((r) => r.status === "duplicate").length;
  const invalidCount = prepared.filter((r) => r.status === "invalid").length;
  const validCount = prepared.filter((r) => r.status === "valid").length;

  return {
    setup: mathSetup,
    prepared,
    previewRows,
    summary: {
      total: rawRows.length,
      valid: validCount,
      invalid: invalidCount,
      duplicates: duplicateCount,
      year,
      openingAmount: roundMoney(setup.openingAmount),
      startingOpeningAmount,
      totalPurchaseValue,
      totalSaleBalance,
      expectedTotalBalance: running,
      expectedAnnualDepreciation: totalAnnualDepreciation,
      expectedTotalDepreciation: totalDepreciation,
      expectedAccumulatedDepreciation: roundMoney(
        setup.accumulatedDepreciation + totalAnnualDepreciation
      ),
      expectedNetBookValue: totalNetBookValue,
      depreciationMode: setup.depreciationMode,
      depreciationRate: setup.depreciationRate,
      usefulYears: setup.usefulYears,
      canImport: validCount > 0 && invalidCount === 0 && duplicateCount === 0,
    },
  };
}

export async function previewVehicleImport(
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
    rows: prepared.previewRows.map((item) => ({
      row: item.row,
      status: item.status,
      errors: item.errors,
      data: item.data,
      openingAmount: item.openingAmount,
      purchaseUnitPrice: item.purchaseUnitPrice,
      saleBalance: item.saleBalance,
      totalBalance: item.totalBalance,
      accumulatedDepreciation: item.accumulatedDepreciation,
      annualDep: item.annualDep,
      totalDep: item.totalDep,
      netBookValue: item.netBookValue,
    })),
  };
}

export async function commitVehicleImport(
  organizationId: string,
  input: { year: number | string; rows?: RawRow[]; fileName?: string },
  actor?: VehicleActor
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

  const alreadyImported = await prisma.vehicleImportBatch.findFirst({
    where: { organizationId, financialYearId: fy.id, fingerprint },
    orderBy: { createdAt: "desc" },
  });
  if (alreadyImported) {
    throw new AppError(
      409,
      `This exact file was already imported for ${year} on ${alreadyImported.createdAt
        .toISOString()
        .slice(0, 10)}.`
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
    const setup = await tx.vehicleSetup.findUnique({
      where: { organizationId_financialYearId: { organizationId, financialYearId: fy.id } },
    });
    if (!setup) throw new AppError(400, `Vehicle Setup is required for ${year}`);

    const last = await tx.vehicleRecord.findFirst({
      where: { organizationId, financialYearId: fy.id, deletedAt: null },
      orderBy: [{ sequence: "desc" }, { createdAt: "desc" }],
    });

    let sequence = last?.sequence ?? 0;
    let openingAmount = roundMoney(last?.totalBalance ?? setup.openingAmount);
    let totalPurchaseValue = 0;
    let totalSaleBalance = 0;

    const batch = await tx.vehicleImportBatch.create({
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

    const mathSetup = setupToMath(setup);

    for (const item of validRows) {
      const data = item.data!;
      const math = computeVehicleRowMath(
        {
          id: "",
          sequence: sequence + 1,
          purchaseUnitPrice: data.purchaseUnitPrice,
          saleBalance: data.saleBalance,
          openingAmount,
          totalBalance: 0,
          accumulatedDepreciation: 0,
          annualDep: 0,
          totalDep: 0,
          netBookValue: 0,
          depRate: data.depRate,
          depMode: data.depMode,
          usefulYears: data.usefulYears,
          useSetupDepreciation: data.useSetupDepreciation,
          quantity: data.quantity,
        },
        mathSetup,
        openingAmount
      );

      sequence += 1;
      totalPurchaseValue = roundMoney(totalPurchaseValue + data.purchaseUnitPrice);
      totalSaleBalance = roundMoney(totalSaleBalance + data.saleBalance);

      await tx.vehicleRecord.create({
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
          importBatchId: batch.id,
          createdByUserId: actor?.userId ?? null,
          createdByEmail: actor?.email ?? null,
        },
      });

      openingAmount = math.totalBalance;
    }

    await tx.vehicleImportBatch.update({
      where: { id: batch.id },
      data: {
        openingAmount: roundMoney(setup.openingAmount),
        totalPurchaseValue,
        totalSaleBalance,
        closingBalance: openingAmount,
        rowCount: validRows.length,
      },
    });

    await tx.vehicleAuditLog.create({
      data: {
        organizationId,
        financialYearId: fy.id,
        year,
        action: "import",
        detail: `Imported ${validRows.length} vehicle record(s)`,
        metadata: {
          batchId: batch.id,
          fileName: input.fileName ?? null,
          rowCount: validRows.length,
          totalPurchaseValue,
          totalSaleBalance,
          closingBalance: openingAmount,
        } as never,
        actorUserId: actor?.userId ?? null,
        actorEmail: actor?.email ?? null,
      },
    });

    return {
      batchId: batch.id,
      imported: validRows.length,
      openingAmount: roundMoney(setup.openingAmount),
      totalPurchaseValue,
      totalSaleBalance,
      closingBalance: openingAmount,
    };
  });
}

export async function listVehicleImportBatches(organizationId: string, year?: number) {
  return prisma.vehicleImportBatch.findMany({
    where: { organizationId, ...(year ? { year: Number(year) } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
