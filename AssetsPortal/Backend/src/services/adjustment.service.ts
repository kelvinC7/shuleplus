import { AssetAdjustmentType } from "../generated/prisma";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";
import type { JwtPayload } from "../middleware/auth.middleware";
import {
  computeAdjustedAssetFinancials,
  computeCarryForwardTotalDep,
  priorYearHasManualDepAdjustments,
  sumAdjustments,
  adjustmentTypeLabel,
  formatSignedAmount,
  type AdjustmentRecord,
  type AdjustedFinancialResult,
} from "./adjustment-math";
import { isLandCategory, normalizeAssetName } from "./register-math";

const ASSETS_WRITE_ROLES = new Set([
  "ORGANIZATION_ADMIN",
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "ASSETS_MANAGER",
  "ASSET_MANAGER",
  "ACCOUNTANT",
  "SUPER_ADMIN",
  "FULL_SYSTEM_CONTROLLER",
]);

/** Any authenticated Assets Portal user (module license enforced on routes). */
export function canCreateAssetAdjustments(user?: JwtPayload | null): boolean {
  return Boolean(user?.sub);
}

export function assertCanCreateAssetAdjustments(user?: JwtPayload | null): void {
  if (!user?.sub) {
    throw new AppError(401, "Authentication required");
  }
}

/** Stricter optional check for orgs that assign adjustment roles explicitly. */
export function hasAdjustmentRole(user?: JwtPayload | null): boolean {
  if (!user?.roles?.length) return false;
  return user.roles.some((r) => ASSETS_WRITE_ROLES.has(r));
}

const ADJUSTMENT_TYPES: AssetAdjustmentType[] = [
  AssetAdjustmentType.cost_increase,
  AssetAdjustmentType.cost_decrease,
  AssetAdjustmentType.accumulated_dep_increase,
  AssetAdjustmentType.accumulated_dep_decrease,
  AssetAdjustmentType.annual_dep_increase,
  AssetAdjustmentType.annual_dep_decrease,
  AssetAdjustmentType.total_dep_increase,
  AssetAdjustmentType.total_dep_decrease,
];

function parseAdjustmentType(value: string): AssetAdjustmentType {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const match = ADJUSTMENT_TYPES.find((t) => t === normalized);
  if (!match) {
    throw new AppError(400, `Invalid adjustment type: ${value}`);
  }
  return match;
}

async function fetchRegisterAsset(organizationId: string, assetId: string) {
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, organizationId, deletedAt: null },
  });
  if (!asset) throw new AppError(404, "Asset not found");
  return asset;
}

export async function loadAdjustmentsForAssetCode(
  organizationId: string,
  assetCode: string
): Promise<AdjustmentRecord[]> {
  return prisma.assetAdjustment.findMany({
    where: { organizationId, assetCode },
    orderBy: [{ registerYear: "asc" }, { createdAt: "asc" }],
    select: { adjustmentType: true, amount: true, registerYear: true },
  });
}

/** Resolve all asset codes that represent the same physical asset (sku, name, or code). */
async function resolveLinkedAssetCodes(
  organizationId: string,
  row: { assetCode: string; assetName: string; sku?: string | null }
): Promise<string[]> {
  const nameKey = normalizeAssetName(row.assetName);
  const orFilters: Array<Record<string, unknown>> = [{ assetCode: row.assetCode }];
  if (row.sku?.trim()) orFilters.push({ sku: row.sku.trim() });
  if (nameKey) {
    orFilters.push({
      assetName: { equals: row.assetName.trim(), mode: "insensitive" as const },
    });
  }

  const matches = await prisma.asset.findMany({
    where: { organizationId, deletedAt: null, OR: orFilters },
    select: { assetCode: true },
  });
  return [...new Set(matches.map((m) => m.assetCode))];
}

/** Load adjustments for this asset and linked rows (same SKU / name across years). */
export async function loadAdjustmentsForAssetRow(
  organizationId: string,
  row: { assetCode: string; assetName: string; sku?: string | null }
): Promise<AdjustmentRecord[]> {
  const codes = await resolveLinkedAssetCodes(organizationId, row);
  if (!codes.length) return [];

  return prisma.assetAdjustment.findMany({
    where: { organizationId, assetCode: { in: codes } },
    orderBy: [{ registerYear: "asc" }, { createdAt: "asc" }],
    select: { adjustmentType: true, amount: true, registerYear: true },
  });
}

async function findPriorYearSameAssetClosing(
  organizationId: string,
  row: {
    assetCode: string;
    assetName: string;
    sku?: string | null;
    registerYear: number;
    categoryName: string;
  }
) {
  const nameKey = normalizeAssetName(row.assetName);
  const orFilters: Array<Record<string, unknown>> = [{ assetCode: row.assetCode }];
  if (row.sku?.trim()) orFilters.push({ sku: row.sku.trim() });
  if (nameKey) {
    orFilters.push({
      assetName: { equals: row.assetName.trim(), mode: "insensitive" as const },
    });
  }

  return prisma.asset.findFirst({
    where: {
      organizationId,
      registerYear: row.registerYear - 1,
      categoryName: row.categoryName,
      deletedAt: null,
      OR: orFilters,
    },
    orderBy: { id: "desc" },
    select: {
      totalDep: true,
      totalBalance: true,
      id: true,
      assetCode: true,
      assetName: true,
      sku: true,
      registerYear: true,
      categoryName: true,
    },
  });
}

export async function resolveAssetOpeningAccumulatedDep(
  organizationId: string,
  row: {
    assetCode: string;
    assetName: string;
    sku?: string | null;
    registerYear: number;
    categoryName: string;
  },
  categoryYearStartTd: number
): Promise<number> {
  const prior = await findPriorYearSameAssetClosing(organizationId, row);
  if (prior) {
    const adjustments = await loadAdjustmentsForAssetRow(organizationId, prior);
    const priorTotals = sumAdjustments(adjustments, {
      registerYear: row.registerYear - 1,
    });
    if (priorYearHasManualDepAdjustments(priorTotals)) {
      return computeCarryForwardTotalDep(prior.totalDep, priorTotals);
    }
    return prior.totalDep;
  }
  return categoryYearStartTd;
}

/** Resolve category year-start TD anchor (KPS: year setup value or carry-forward rule). */
export async function resolveCategoryYearStartTotalDep(
  organizationId: string,
  registerYear: number,
  categoryName: string,
  opts: {
    yearSetupAccumulatedStart?: number | null;
    priorYearLast?: {
      totalDep: number;
      assetCode: string;
      assetName: string;
      sku?: string | null;
      registerYear: number;
      categoryName: string;
    } | null;
  }
): Promise<number> {
  if (isLandCategory(categoryName)) return 0;

  if (opts.yearSetupAccumulatedStart != null && opts.yearSetupAccumulatedStart > 0) {
    return opts.yearSetupAccumulatedStart;
  }

  const prior = opts.priorYearLast;
  if (!prior) return 0;

  const adjustments = await loadAdjustmentsForAssetRow(organizationId, prior);
  const priorTotals = sumAdjustments(adjustments, { registerYear: registerYear - 1 });
  if (priorYearHasManualDepAdjustments(priorTotals)) {
    return computeCarryForwardTotalDep(prior.totalDep, priorTotals);
  }
  return prior.totalDep;
}

export async function buildAssetFinancialBreakdown(
  organizationId: string,
  assetId: string
): Promise<{
  asset: Awaited<ReturnType<typeof fetchRegisterAsset>>;
  financials: AdjustedFinancialResult;
  hasAdjustments: boolean;
}> {
  const asset = await fetchRegisterAsset(organizationId, assetId);
  const adjustments = await loadAdjustmentsForAssetRow(organizationId, asset);
  const hasAdjustments = adjustments.length > 0;

  const originalTotalBalance = asset.originalTotalBalance ?? asset.totalBalance;
  const originalAccumulatedDep =
    asset.originalAccumulatedDep ?? asset.accumulatedDepreciation;
  const originalDepRate = asset.originalDepRate ?? asset.depRate;

  const openingAccumulatedDep = hasAdjustments
    ? await resolveAssetOpeningAccumulatedDep(
        organizationId,
        asset,
        originalAccumulatedDep
      )
    : originalAccumulatedDep;

  const financials = computeAdjustedAssetFinancials({
    originalTotalBalance,
    originalAccumulatedDep,
    originalDepRate,
    openingAccumulatedDep,
    registerYear: asset.registerYear,
    adjustments,
    isLand: isLandCategory(asset.categoryName),
  });

  return { asset, financials, hasAdjustments };
}

export async function listAssetAdjustments(organizationId: string, assetId: string) {
  const asset = await fetchRegisterAsset(organizationId, assetId);
  const rows = await prisma.assetAdjustment.findMany({
    where: { organizationId, assetCode: asset.assetCode },
    orderBy: [{ adjustmentDate: "desc" }, { createdAt: "desc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    assetId: row.assetId,
    assetCode: row.assetCode,
    registerYear: row.registerYear,
    adjustmentType: row.adjustmentType,
    adjustmentTypeLabel: adjustmentTypeLabel(row.adjustmentType),
    amount: row.amount,
    signedAmount: formatSignedAmount(row.adjustmentType, row.amount),
    reason: row.reason,
    note: row.note,
    adjustmentDate: row.adjustmentDate,
    previousValue: row.previousValue,
    newValue: row.newValue,
    createdByUserId: row.createdByUserId,
    createdByEmail: row.createdByEmail,
    createdByName: row.createdByName,
    createdAt: row.createdAt,
  }));
}


export async function createAssetAdjustment(
  organizationId: string,
  assetId: string,
  input: {
    adjustmentType: string;
    amount: number;
    registerYear?: number;
    reason: string;
    note?: string;
    adjustmentDate?: string;
  },
  user: JwtPayload
) {
  assertCanCreateAssetAdjustments(user);

  const asset = await fetchRegisterAsset(organizationId, assetId);
  const adjustmentType = parseAdjustmentType(input.adjustmentType);
  const amount = Math.abs(Number(input.amount));
  if (!(amount > 0)) throw new AppError(400, "Adjustment amount must be greater than 0");

  const reason = input.reason?.trim();
  if (!reason) throw new AppError(400, "Reason is required for asset adjustments");

  const registerYear = Number(input.registerYear ?? asset.registerYear);
  if (!registerYear) throw new AppError(400, "Effective register year is required");

  const { financials } = await buildAssetFinancialBreakdown(organizationId, assetId);

  let previousValue: number;
  let newValue: number;

  switch (adjustmentType) {
    case AssetAdjustmentType.cost_increase:
    case AssetAdjustmentType.cost_decrease:
      previousValue = financials.adjustedTotalBalance;
      newValue =
        previousValue +
        (adjustmentType === AssetAdjustmentType.cost_increase ? amount : -amount);
      break;
    case AssetAdjustmentType.accumulated_dep_increase:
    case AssetAdjustmentType.accumulated_dep_decrease:
      previousValue = financials.adjustedOpeningAccumulatedDep;
      newValue =
        previousValue +
        (adjustmentType === AssetAdjustmentType.accumulated_dep_increase ? amount : -amount);
      break;
    case AssetAdjustmentType.annual_dep_increase:
    case AssetAdjustmentType.annual_dep_decrease:
      previousValue = financials.finalAnnualDep;
      newValue =
        previousValue +
        (adjustmentType === AssetAdjustmentType.annual_dep_increase ? amount : -amount);
      break;
    case AssetAdjustmentType.total_dep_increase:
    case AssetAdjustmentType.total_dep_decrease:
      previousValue = financials.closingAccumulatedDep;
      newValue =
        previousValue +
        (adjustmentType === AssetAdjustmentType.total_dep_increase ? amount : -amount);
      break;
    default:
      previousValue = 0;
      newValue = 0;
  }

  const createdByName =
    user.email?.split("@")[0]?.replace(/[._-]+/g, " ") || user.email || "User";

  const adjustment = await prisma.assetAdjustment.create({
    data: {
      organizationId,
      assetId: asset.id,
      assetCode: asset.assetCode,
      registerYear,
      adjustmentType,
      amount,
      reason,
      note: input.note?.trim() || null,
      adjustmentDate: input.adjustmentDate ? new Date(input.adjustmentDate) : new Date(),
      previousValue,
      newValue,
      createdByUserId: user.sub,
      createdByEmail: user.email,
      createdByName,
    },
  });

  return {
    adjustment: {
      ...adjustment,
      adjustmentTypeLabel: adjustmentTypeLabel(adjustment.adjustmentType),
      signedAmount: formatSignedAmount(adjustment.adjustmentType, adjustment.amount),
    },
    categoryName: asset.categoryName,
    registerYear,
    financials: await getAssetFinancialDetails(organizationId, assetId),
  };
}

export async function getAssetFinancialDetails(organizationId: string, assetId: string) {
  const { asset, financials, hasAdjustments } = await buildAssetFinancialBreakdown(
    organizationId,
    assetId
  );
  const history = await listAssetAdjustments(organizationId, assetId);

  return {
    asset,
    hasAdjustments,
    canAdjust: true,
    original: {
      assetCost: asset.unitPrice,
      totalBalance: financials.originalTotalBalance,
      accumulatedDepreciation: financials.originalAccumulatedDep,
      depreciationRate: financials.originalDepRate,
    },
    adjustments: {
      costAdjustments: financials.adjustmentTotals.costAdjustments,
      accumulatedDepAdjustments: financials.adjustmentTotals.accumulatedDepAdjustments,
      annualDepAdjustments: financials.adjustmentTotals.annualDepAdjustments,
      totalDepAdjustments: financials.adjustmentTotals.totalDepAdjustments,
    },
    calculated: {
      adjustedAssetCost:
        asset.unitPrice + financials.adjustmentTotals.costAdjustments,
      adjustedTotalBalance: financials.adjustedTotalBalance,
      openingAccumulatedDepreciation: financials.openingAccumulatedDep,
      adjustedOpeningAccumulatedDepreciation: financials.adjustedOpeningAccumulatedDep,
      systemAnnualDepreciation: financials.systemAnnualDep,
      manualDepreciationAdjustment: financials.manualAnnualDepAdjustment,
      finalAnnualDepreciation: financials.finalAnnualDep,
      systemClosingAccumulatedDepreciation: financials.systemClosingAccumulatedDep,
      manualTotalDepAdjustment: financials.manualTotalDepAdjustment,
      closingAccumulatedDepreciation: financials.closingAccumulatedDep,
      netBookValue: financials.netBookValue,
    },
    history,
  };
}

/** Used by register recalc — apply adjustments to a single asset row after base chain math. */
export async function applyAdjustmentsToAssetRow(
  organizationId: string,
  row: {
    id: string;
    assetCode: string;
    assetName: string;
    sku?: string | null;
    registerYear: number;
    categoryName: string;
  },
  baseMath: {
    opening: number;
    purchasePrice: number;
    totalBalance: number;
    accumulatedStart: number;
    rate: number;
    annualDep: number;
    totalDep: number;
    netBookValue: number;
  },
  categoryYearStartTd: number,
  persisted?: {
    originalTotalBalance?: number | null;
    originalAccumulatedDep?: number | null;
    originalDepRate?: number | null;
  }
) {
  const adjustments = await loadAdjustmentsForAssetRow(organizationId, row);
  if (adjustments.length === 0) {
    return {
      ...baseMath,
      originalTotalBalance: baseMath.totalBalance,
      originalAccumulatedDep: baseMath.accumulatedStart,
      originalDepRate: baseMath.rate,
      hasAdjustments: false,
    };
  }

  const originalTotalBalance =
    persisted?.originalTotalBalance ?? baseMath.totalBalance;
  const originalAccumulatedDep =
    persisted?.originalAccumulatedDep ?? categoryYearStartTd;
  const originalDepRate = persisted?.originalDepRate ?? baseMath.rate;

  const openingAccumulatedDep = await resolveAssetOpeningAccumulatedDep(
    organizationId,
    row,
    categoryYearStartTd
  );

  const adjusted = computeAdjustedAssetFinancials({
    originalTotalBalance,
    originalAccumulatedDep,
    originalDepRate,
    openingAccumulatedDep,
    registerYear: row.registerYear,
    adjustments,
    isLand: isLandCategory(row.categoryName),
  });

  return {
    opening: baseMath.opening,
    purchasePrice: baseMath.purchasePrice,
    totalBalance: adjusted.adjustedTotalBalance,
    accumulatedStart: adjusted.adjustedOpeningAccumulatedDep,
    rate: originalDepRate,
    annualDep: adjusted.finalAnnualDep,
    totalDep: adjusted.closingAccumulatedDep,
    netBookValue: adjusted.netBookValue,
    originalTotalBalance,
    originalAccumulatedDep,
    originalDepRate,
    hasAdjustments: true,
  };
}

export async function assetCodeHasAdjustments(
  organizationId: string,
  assetCode: string
): Promise<boolean> {
  const count = await prisma.assetAdjustment.count({
    where: { organizationId, assetCode },
  });
  return count > 0;
}

/** Category-years containing assets with manual adjustments (list view should use DB values). */
export async function findCategoryYearsWithAdjustments(
  organizationId: string,
  keys: string[]
): Promise<Set<string>> {
  if (!keys.length) return new Set();

  const parsed = keys.map((key) => {
    const [categoryName, yearStr] = key.split("::");
    return { key, categoryName, registerYear: Number(yearStr) };
  });

  const [adjustments, pageAssets] = await Promise.all([
    prisma.assetAdjustment.findMany({
      where: { organizationId },
      select: { assetCode: true },
    }),
    prisma.asset.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: parsed.map(({ categoryName, registerYear }) => ({
          categoryName,
          registerYear,
        })),
      },
      select: {
        assetCode: true,
        assetName: true,
        sku: true,
        categoryName: true,
        registerYear: true,
      },
    }),
  ]);

  if (!adjustments.length || !pageAssets.length) return new Set();

  const adjCodes = [...new Set(adjustments.map((a) => a.assetCode))];
  const adjOwnerAssets = await prisma.asset.findMany({
    where: { organizationId, assetCode: { in: adjCodes } },
    select: { assetName: true, sku: true },
  });

  const linkedNames = new Set<string>();
  const linkedSkus = new Set<string>();
  for (const a of adjOwnerAssets) {
    const nk = normalizeAssetName(a.assetName);
    if (nk) linkedNames.add(nk);
    if (a.sku?.trim()) linkedSkus.add(a.sku.trim());
  }

  const adjCodeSet = new Set(adjCodes);
  const result = new Set<string>();
  for (const asset of pageAssets) {
    const nameKey = normalizeAssetName(asset.assetName);
    const hasAdj =
      adjCodeSet.has(asset.assetCode) ||
      (nameKey ? linkedNames.has(nameKey) : false) ||
      (asset.sku?.trim() ? linkedSkus.has(asset.sku.trim()) : false);
    if (hasAdj) {
      result.add(`${asset.categoryName}::${asset.registerYear}`);
    }
  }
  return result;
}
