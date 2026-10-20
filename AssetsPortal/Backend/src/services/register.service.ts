import { BuildingStatus, EntryMode, AssetHealthStatus } from "../generated/prisma";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";
import {
  computeAssetRegisterMath,
  computeBuildingChainStep,
  computeRegisterChainStep,
  enrichRegisterChainFinancials,
  finalizeBuildingsYearFinancials,
  finalizeStandardYearFinancials,
  isBuildingsCategory,
  isLandCategory,
  isVehicleCategory,
  isWorkingProgressStatus,
  normalizeBuildingStatus,
  normalizeAssetName,
  normalizeDepRatePercent,
  resolveRowDepRate,
  type RegisterMathResult,
  type WipYearRow,
} from "./register-math";
import { listCategories } from "./category.service";
import { getActiveFinancialYear, listFinancialYears } from "./year.service";
import {
  isEmptyImportRow,
  isOpeningBalanceRow,
  resolveImportCategory,
  parseImportDepRate,
  isBeforeImportMinYear,
  isImportTemplateSampleRow,
  getCategoryChainAliases,
  getCategoryChainKey,
  IMPORT_MIN_REGISTER_YEAR,
  IMPORT_TEMPLATE_SAMPLE_ROWS,
  sheetNameToTypeHint,
} from "./import-category-map";
import { applyAdjustmentsToAssetRow, findCategoryYearsWithAdjustments, resolveCategoryYearStartTotalDep } from "./adjustment.service";

async function resolvePriorSameAssetWipNetBook(
  organizationId: string,
  year: number,
  categoryName: string,
  assetName: string
): Promise<number | null> {
  const key = normalizeAssetName(assetName);
  if (!key || year <= 1900) return null;
  const priorRows = await prisma.asset.findMany({
    where: {
      organizationId,
      registerYear: year - 1,
      categoryName,
      deletedAt: null,
      buildingStatus: BuildingStatus.WorkingProgress,
    },
    select: { assetName: true, netBookValue: true },
  });
  const match = priorRows.find((a) => normalizeAssetName(a.assetName) === key);
  return match?.netBookValue ?? null;
}

function toBuildingEnum(status?: string | null): BuildingStatus | null {
  const n = normalizeBuildingStatus(status);
  if (n === "Finished") return BuildingStatus.Finished;
  if (n === "Working Progress") return BuildingStatus.WorkingProgress;
  return null;
}

function healthEnum(v?: string | null): AssetHealthStatus {
  if (!v) return AssetHealthStatus.Used;
  const s = v.toLowerCase();
  if (s.includes("not") || s.includes("old")) return AssetHealthStatus.NotUsedOld;
  return AssetHealthStatus.Used;
}

async function resolveCategory(organizationId: string, categoryName: string) {
  const categories = await listCategories(organizationId);
  const cat = categories.find((c) => c.name.toLowerCase() === categoryName.trim().toLowerCase());
  if (!cat) throw new AppError(400, `Unknown category "${categoryName}". Use an exact category name.`);
  return cat;
}

export async function resolveCategoryOpeningContext(
  organizationId: string,
  opts: {
    year: number;
    category: string;
    entryMode?: "year_setup" | "legacy";
    editAssetId?: string;
    assetName?: string;
    buildingStatus?: string;
  }
) {
  const year = Number(opts.year);
  const cat = await resolveCategory(organizationId, opts.category);
  const chainAliases = await resolveCategoryChainAliases(organizationId, cat.name);

  const assets = await prisma.asset.findMany({
    where: {
      organizationId,
      registerYear: year,
      categoryName: cat.name,
      deletedAt: null,
      ...(opts.editAssetId ? { NOT: { id: opts.editAssetId } } : {}),
    },
    orderBy: { id: "asc" },
  });

  const fyBal = await findYearCategoryBalanceForChain(
    organizationId,
    year,
    cat.name,
    chainAliases
  );

  const priorYearLast = await findPriorYearChainEnd(organizationId, year, chainAliases);

  let effectiveOpening = 0;
  let effectiveTd = 0;
  let source = "year_setup";
  let sourceLabel = "From Year Setup opening balances";
  let priorYearNetBook: number | null = null;
  let priorProgressPurchase: number | null = null;

  if (assets.length > 0) {
    const last = assets[assets.length - 1];
    effectiveOpening = last.totalBalance;
    const { yearStartTd } = await resolveYearStartChainAnchors(
      organizationId,
      year,
      cat.name
    );
    effectiveTd = yearStartTd;
    source = "ledger";
    sourceLabel = `Continues from last asset ${last.assetCode}`;
  } else if (priorYearLast) {
    effectiveOpening = priorYearLast.totalBalance;
    effectiveTd = priorYearLast.totalDep;
    priorYearNetBook = priorYearLast.netBookValue;
    source = "prior_year";
    sourceLabel = `Carried from ${year - 1} register`;
  } else if (fyBal) {
    effectiveOpening = fyBal.openingBalance;
    effectiveTd = isLandCategory(cat.name) ? 0 : fyBal.accumulatedDepreciationStart;
    source = "year_setup";
    sourceLabel = "From Year Setup opening balances";
  }

  if (isLandCategory(cat.name)) {
    effectiveTd = 0;
  }

  // Same-year prior WIP PP for Buildings
  let wipPurchasePricesInYear: number[] = [];
  if (isBuildingsCategory(cat.name)) {
    const priorWip = assets.filter(
      (a) => a.buildingStatus === BuildingStatus.WorkingProgress
    );
    if (priorWip.length > 0) {
      wipPurchasePricesInYear = priorWip.map((a) => a.unitPrice);
      priorProgressPurchase = priorWip.reduce((s, a) => s + a.unitPrice, 0);
    }
  }

  const priorAsset = assets.length > 0 ? assets[assets.length - 1] : priorYearLast;
  const categoryTotalBalance =
    assets.length > 0 ? assets[assets.length - 1].totalBalance : effectiveOpening;

  const yearStartOpening =
    assets.length > 0
      ? assets[0].openingAmount
      : priorYearLast?.totalBalance ?? fyBal?.openingBalance ?? effectiveOpening;

  let priorSameAssetNetBook: number | null = null;
  if (
    opts.assetName &&
    isBuildingsCategory(cat.name) &&
    normalizeBuildingStatus(opts.buildingStatus) === "Working Progress"
  ) {
    priorSameAssetNetBook = await resolvePriorSameAssetWipNetBook(
      organizationId,
      year,
      cat.name,
      opts.assetName
    );
  }

  return {
    category: cat.name,
    categoryId: cat.id,
    depreciation_rate: normalizeDepRatePercent(
      fyBal?.depreciationRate ?? cat.depreciationRate
    ),
    effective_opening: effectiveOpening,
    effective_accumulated_depreciation: effectiveTd,
    last_year_total_depreciation: priorYearLast?.totalDep ?? effectiveTd,
    prior_asset_net_book: priorYearNetBook,
    prior_progress_purchase: priorProgressPurchase,
    wip_purchase_prices_in_year: wipPurchasePricesInYear,
    category_total_balance: categoryTotalBalance,
    year_start_opening: yearStartOpening,
    prior_same_asset_net_book: priorSameAssetNetBook,
    prior_asset_name: priorAsset?.assetName ?? null,
    prior_asset_code: priorAsset?.assetCode ?? null,
    assets_in_year: assets.length,
    source,
    source_label: sourceLabel,
    entry_mode: opts.entryMode ?? "year_setup",
  };
}

async function nextAssetCode(organizationId: string, year: number, prefix = "AST") {
  const count = await prisma.asset.count({
    where: { organizationId, registerYear: year },
  });
  return `${prefix}-${year}-${String(count + 1).padStart(5, "0")}`;
}

async function buildSku(
  organizationId: string,
  locationLabel: string,
  labelTag: string,
  year: number
) {
  const seq = await prisma.asset.count({ where: { organizationId, registerYear: year } });
  const loc = (locationLabel || "GEN").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8);
  const tag = (labelTag || "AST").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8);
  return `SCH/${loc || "GEN"}/${tag || "AST"}/${String(seq + 1).padStart(5, "0")}`;
}

export async function checkRegisterIdentifiers(
  organizationId: string,
  opts: { registerYear: number; sku?: string; assetCode?: string; excludeId?: string }
) {
  const year = Number(opts.registerYear);
  const conflicts: { field: string; value: string }[] = [];
  if (opts.sku?.trim()) {
    const hit = await prisma.asset.findFirst({
      where: {
        organizationId,
        registerYear: year,
        sku: opts.sku.trim(),
        deletedAt: null,
        ...(opts.excludeId ? { NOT: { id: opts.excludeId } } : {}),
      },
    });
    if (hit) conflicts.push({ field: "sku", value: opts.sku.trim() });
  }
  if (opts.assetCode?.trim()) {
    const hit = await prisma.asset.findFirst({
      where: {
        organizationId,
        registerYear: year,
        assetCode: opts.assetCode.trim(),
        deletedAt: null,
        ...(opts.excludeId ? { NOT: { id: opts.excludeId } } : {}),
      },
    });
    if (hit) conflicts.push({ field: "assetCode", value: opts.assetCode.trim() });
  }
  return { available: conflicts.length === 0, conflicts };
}

export async function getRegisterAsset(organizationId: string, id: string) {
  const asset = await prisma.asset.findFirst({
    where: { id, organizationId, deletedAt: null },
  });
  if (!asset) throw new AppError(404, "Asset not found");
  return asset;
}

/** Resolve alias group to category names that exist for this tenant. */
async function resolveCategoryChainAliases(organizationId: string, categoryName: string) {
  const candidates = getCategoryChainAliases(categoryName);
  const categories = await listCategories(organizationId);
  const matched = categories
    .filter((c) => candidates.some((a) => a.toLowerCase() === c.name.toLowerCase()))
    .map((c) => c.name);
  if (matched.length) return matched;
  const exact = categories.find(
    (c) => c.name.toLowerCase() === categoryName.trim().toLowerCase()
  );
  return exact ? [exact.name] : [categoryName.trim()];
}

async function findYearCategoryBalanceForChain(
  organizationId: string,
  registerYear: number,
  categoryName: string,
  chainAliases: string[]
) {
  const cat = await resolveCategory(organizationId, categoryName);
  const ordered = [cat.name, ...chainAliases.filter((a) => a !== cat.name)];
  for (const name of ordered) {
    const fyBal = await prisma.yearCategoryBalance.findFirst({
      where: {
        organizationId,
        categoryName: name,
        financialYear: { year: registerYear },
      },
    });
    if (fyBal) return fyBal;
  }
  return null;
}

async function findPriorYearChainEnd(
  organizationId: string,
  registerYear: number,
  chainAliases: string[]
) {
  return prisma.asset.findFirst({
    where: {
      organizationId,
      registerYear: registerYear - 1,
      categoryName: { in: chainAliases },
      deletedAt: null,
    },
    orderBy: { id: "desc" },
  });
}

/** Year-start chain anchors — same source as recalcRegisterChainInCategory. */
async function resolveYearStartChainAnchors(
  organizationId: string,
  registerYear: number,
  categoryName: string
) {
  const chainAliases = await resolveCategoryChainAliases(organizationId, categoryName);
  const fyBal = await findYearCategoryBalanceForChain(
    organizationId,
    registerYear,
    categoryName,
    chainAliases
  );
  const priorYearLast = await findPriorYearChainEnd(
    organizationId,
    registerYear,
    chainAliases
  );

  const yearStartOpening =
    priorYearLast?.totalBalance ?? fyBal?.openingBalance ?? 0;
  const yearStartTd = await resolveCategoryYearStartTotalDep(
    organizationId,
    registerYear,
    categoryName,
    {
      yearSetupAccumulatedStart: fyBal?.accumulatedDepreciationStart,
      priorYearLast: priorYearLast
        ? {
            totalDep: priorYearLast.totalDep,
            assetCode: priorYearLast.assetCode,
            assetName: priorYearLast.assetName,
            sku: priorYearLast.sku,
            registerYear: priorYearLast.registerYear,
            categoryName: priorYearLast.categoryName,
          }
        : null,
    }
  );

  const cat = await resolveCategory(organizationId, categoryName);
  const depreciationRate = normalizeDepRatePercent(
    fyBal?.depreciationRate ?? cat.depreciationRate
  );

  return { yearStartOpening, yearStartTd, depreciationRate, chainAliases };
}

export async function recalcRegisterChainInCategory(
  organizationId: string,
  registerYear: number,
  categoryName: string
) {
  const cat = await resolveCategory(organizationId, categoryName);

  const rows = await prisma.asset.findMany({
    where: {
      organizationId,
      registerYear,
      categoryName: cat.name,
      deletedAt: null,
    },
    orderBy: { id: "asc" },
  });

  const fyBal = await prisma.yearCategoryBalance.findFirst({
    where: { organizationId, categoryName: cat.name, financialYear: { year: registerYear } },
  });

  const { yearStartOpening, yearStartTd, depreciationRate } =
    await resolveYearStartChainAnchors(organizationId, registerYear, cat.name);

  if (rows.length === 0) {
    if (fyBal) {
      await prisma.yearCategoryBalance.update({
        where: { id: fyBal.id },
        data: {
          purchases: 0,
          annualDepreciation: 0,
          closingBalance: yearStartOpening,
        },
      });
    }
    return { updated: 0 };
  }

  let opening = yearStartOpening;
  const td = yearStartTd;
  let sumPurchases = 0;
  let sumAd = 0;
  let lastNbv = yearStartOpening;

  const priorYearWipByName = new Map<string, number>();
  if (isBuildingsCategory(cat.name)) {
    const priorYearAssets = await prisma.asset.findMany({
      where: {
        organizationId,
        registerYear: registerYear - 1,
        categoryName: cat.name,
        deletedAt: null,
        buildingStatus: BuildingStatus.WorkingProgress,
      },
      select: { assetName: true, netBookValue: true },
    });
    for (const a of priorYearAssets) {
      priorYearWipByName.set(normalizeAssetName(a.assetName), a.netBookValue);
    }
  }

  const chainRows: WipYearRow[] = [];
  const rowIds: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const isFirst = i === 0;
    const isWip =
      isBuildingsCategory(cat.name) &&
      isWorkingProgressStatus(row.buildingStatus as string);

    const chain = computeRegisterChainStep(opening, row.unitPrice, {
      categoryName: cat.name,
      saleBalance: row.saleBalance,
      applySaleBalance: row.applySaleBalance,
    });

    chainRows.push({
      isWip,
      purchasePrice: row.unitPrice,
      chainOpening: chain.opening,
      chainTotalBalance: chain.totalBalance,
      accumulatedStart: td,
      rate: resolveRowDepRate(row.depRate, depreciationRate),
      isFirstInYear: isFirst,
      priorSameAssetNetBook:
        isFirst && isWip
          ? priorYearWipByName.get(normalizeAssetName(row.assetName)) ?? null
          : null,
      saleBalance: row.saleBalance,
      applySaleBalance: row.applySaleBalance,
    });
    rowIds.push(row.id);

    sumPurchases += row.unitPrice;
    opening = chain.totalBalance;
  }

  const finalized = isBuildingsCategory(cat.name)
    ? finalizeBuildingsYearFinancials(chainRows, yearStartOpening)
    : finalizeStandardYearFinancials(chainRows, cat.name);

  let rollingOpening = yearStartOpening;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const chain = computeRegisterChainStep(rollingOpening, row.unitPrice, {
      categoryName: cat.name,
      saleBalance: row.saleBalance,
      applySaleBalance: row.applySaleBalance,
    });
    let math = finalized[i];

    if (
      !isBuildingsCategory(cat.name) ||
      !isWorkingProgressStatus(row.buildingStatus as string)
    ) {
      math = computeAssetRegisterMath({
        opening: chain.opening,
        purchasePrice: row.unitPrice,
        accumulatedStart: td,
        rate: resolveRowDepRate(row.depRate, depreciationRate),
        categoryName: cat.name,
        saleBalance: row.saleBalance,
        applySaleBalance: row.applySaleBalance,
      });
    } else {
      math = {
        ...math,
        opening: chain.opening,
        totalBalance: chain.totalBalance,
      };
    }

    const applied = await applyAdjustmentsToAssetRow(
      organizationId,
      {
        id: row.id,
        assetCode: row.assetCode,
        assetName: row.assetName,
        sku: row.sku,
        registerYear: row.registerYear,
        categoryName: row.categoryName,
      },
      math,
      td,
      {
        originalTotalBalance: row.originalTotalBalance,
        originalAccumulatedDep: row.originalAccumulatedDep,
        originalDepRate: row.originalDepRate,
      }
    );

    await prisma.asset.update({
      where: { id: rowIds[i] },
      data: {
        openingAmount: applied.opening,
        totalBalance: applied.totalBalance,
        accumulatedDepreciation: applied.accumulatedStart,
        annualDep: applied.annualDep,
        totalDep: applied.totalDep,
        netBookValue: applied.netBookValue,
        depRate: applied.rate,
        originalTotalBalance: applied.originalTotalBalance,
        originalAccumulatedDep: applied.originalAccumulatedDep,
        originalDepRate: applied.originalDepRate,
      },
    });
    sumAd += applied.annualDep;
    lastNbv = applied.netBookValue;
    rollingOpening = applied.totalBalance;
  }

  if (fyBal) {
    await prisma.yearCategoryBalance.update({
      where: { id: fyBal.id },
      data: {
        purchases: sumPurchases,
        annualDepreciation: sumAd,
        closingBalance: lastNbv,
      },
    });
  }

  await recalcFinancialYearTotals(organizationId, registerYear);
  return { updated: rows.length };
}

/** Recalculate full category register chain from a year forward (after manual adjustments). */
export async function recalcCategoryRegisterFromYear(
  organizationId: string,
  categoryName: string,
  fromYear: number
) {
  const yearRows = await prisma.asset.findMany({
    where: {
      organizationId,
      categoryName,
      registerYear: { gte: fromYear },
      deletedAt: null,
    },
    select: { registerYear: true },
    distinct: ["registerYear"],
    orderBy: { registerYear: "asc" },
  });

  const years = [...new Set([fromYear, ...yearRows.map((r) => r.registerYear)])].sort(
    (a, b) => a - b
  );

  for (const year of years) {
    await recalcRegisterChainInCategory(organizationId, year, categoryName);
  }

  return { years: years.length };
}

export async function recalcFinancialYearTotals(organizationId: string, year: number) {
  const fy = await prisma.financialYear.findUnique({
    where: { organizationId_year: { organizationId, year } },
    include: { categoryBalances: true },
  });
  if (!fy) return;
  const totalOpening = fy.categoryBalances.reduce((s, b) => s + b.openingBalance, 0);
  const totalPurchases = fy.categoryBalances.reduce((s, b) => s + b.purchases, 0);
  const totalClosing = fy.categoryBalances.reduce((s, b) => s + b.closingBalance, 0);
  await prisma.financialYear.update({
    where: { id: fy.id },
    data: { totalOpening, totalPurchases, totalClosing },
  });
}

export async function registerAssetWithLedger(
  organizationId: string,
  input: {
    assetName: string;
    category: string;
    registerYear: number;
    location?: string;
    locationLabel?: string;
    purchasePrice: number;
    buildingStatus?: string;
    entryMode?: "year_setup" | "legacy";
    firstTime?: boolean;
    skuMode?: "auto" | "manual";
    sku?: string;
    assetCode?: string;
    applyTax?: boolean;
    assetHealthStatus?: string;
    quantity?: number;
    serialNumber?: string;
    labelTag?: string;
    purchaseDate?: string;
    supplier?: string;
    conditionCode?: string;
    receiptRefs?: string;
    depRate?: number;
    saleBalance?: number;
    applySaleBalance?: boolean;
    landProvince?: string | null;
    landDistrict?: string | null;
    landSector?: string | null;
    landCellule?: string | null;
    landVillage?: string | null;
    landUpi?: string | null;
  },
  opts?: { skipChainRecalc?: boolean }
) {
  if (!input.assetName?.trim()) throw new AppError(400, "Asset name is required");
  if (!input.category?.trim()) throw new AppError(400, "Category is required");

  const cat = await resolveCategory(organizationId, input.category);
  const isLand = isLandCategory(cat.name);

  if (!input.location?.trim() && !isLand) throw new AppError(400, "Location is required");
  if (!input.locationLabel?.trim() && !isLand) throw new AppError(400, "Location label is required");

  const pp = Number(input.purchasePrice) || 0;
  if (!allowsZeroPurchasePrice(cat.name) && !(pp > 0)) {
    throw new AppError(400, "Purchase price must be greater than 0");
  }
  if (pp < 0) throw new AppError(400, "Purchase price cannot be negative");
  if (!Number(input.registerYear)) throw new AppError(400, "Register year is required");

  const landFields = isLand
    ? {
        landProvince: input.landProvince ?? null,
        landDistrict: input.landDistrict ?? null,
        landSector: input.landSector ?? null,
        landCellule: input.landCellule ?? null,
        landVillage: input.landVillage ?? null,
        landUpi: input.landUpi ?? null,
      }
    : null;
  const resolvedLocation =
    input.location?.trim() ||
    (landFields ? landLocationFromFields(landFields) : "") ||
    "Imported";
  const resolvedLocationLabel =
    input.locationLabel?.trim().toUpperCase() ||
    (landFields?.landUpi ? landFields.landUpi.slice(0, 12).toUpperCase() : "LAND");

  const qty = Math.max(1, Math.min(100, Number(input.quantity) || 1));
  if (qty > 1) {
    return registerAssetsBulkWithLedger(organizationId, { ...input, quantity: qty }, opts);
  }

  const year = Number(input.registerYear);

  if (input.firstTime !== false && input.entryMode !== "legacy") {
    const active = await prisma.financialYear.findFirst({
      where: { organizationId, status: "Active" },
    });
    if (!active) throw new AppError(400, "Active financial year is required for First time mode");
    if (active.year !== year) {
      throw new AppError(400, `First time mode requires Active year ${active.year}`);
    }
  }

  if (input.skuMode === "manual" && input.sku?.trim()) {
    const check = await checkRegisterIdentifiers(organizationId, {
      registerYear: year,
      sku: input.sku,
    });
    if (!check.available) throw new AppError(409, `SKU already exists for year ${year}`);
  }

  const openingCtx = await resolveCategoryOpeningContext(organizationId, {
    year,
    category: cat.name,
    entryMode: input.entryMode,
    assetName: input.assetName.trim(),
    buildingStatus: input.buildingStatus,
  });

  const applySaleBalance = Boolean(input.applySaleBalance);
  const saleBalance = Math.max(0, Number(input.saleBalance) || 0);
  const isWip =
    isBuildingsCategory(cat.name) &&
    normalizeBuildingStatus(input.buildingStatus) === "Working Progress";
  const existingWip = openingCtx.wip_purchase_prices_in_year ?? [];
  const allWipPP = isWip ? [...existingWip, pp].filter((n) => n > 0) : undefined;
  const poolTB =
    isWip && allWipPP?.length
      ? (openingCtx.category_total_balance ?? openingCtx.effective_opening) + pp
      : undefined;

  const math = computeAssetRegisterMath({
    opening: openingCtx.effective_opening,
    purchasePrice: pp,
    accumulatedStart: openingCtx.effective_accumulated_depreciation,
    rate: resolveRowDepRate(input.depRate ?? 0, openingCtx.depreciation_rate),
    categoryName: cat.name,
    buildingStatus: normalizeBuildingStatus(input.buildingStatus),
    isFirstInYear: openingCtx.assets_in_year === 0,
    priorSameAssetNetBook: openingCtx.prior_same_asset_net_book,
    yearStartOpening: openingCtx.year_start_opening ?? openingCtx.effective_opening,
    allWipPurchasePricesInYear: allWipPP,
    categoryTotalBalance: isWip ? poolTB : undefined,
    saleBalance,
    applySaleBalance,
  });

  const applyTax = input.applyTax !== false;
  const taxAmount = applyTax ? Math.round(math.purchasePrice * 0.18) : null;
  const priceInclTax = applyTax ? math.purchasePrice + (taxAmount ?? 0) : null;
  const assetCode = input.assetCode?.trim() || (await nextAssetCode(organizationId, year));
  const sku =
    input.skuMode === "manual" && input.sku
      ? input.sku.trim()
      : await buildSku(organizationId, input.locationLabel ?? "", input.labelTag ?? "", year);

  const created = await prisma.asset.create({
    data: {
      organizationId,
      assetCode,
      assetName: input.assetName.trim(),
      sku,
      serialNumber: input.serialNumber,
      labelTag: input.labelTag,
      categoryName: cat.name,
      categoryId: cat.id,
      location: resolvedLocation,
      locationLabel: resolvedLocationLabel,
      buildingStatus: toBuildingEnum(
        isBuildingsCategory(cat.name) ? input.buildingStatus || "Finished" : null
      ),
      registerYear: year,
      openingAmount: math.opening,
      unitPrice: math.purchasePrice,
      saleBalance,
      applySaleBalance,
      ...assetPayloadFields(landFields ?? {}),
      totalBalance: math.totalBalance,
      accumulatedDepreciation: math.accumulatedStart,
      depRate: math.rate,
      annualDep: math.annualDep,
      totalDep: math.totalDep,
      netBookValue: math.netBookValue,
      taxAmount,
      priceInclTax,
      applyTax,
      purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : new Date(),
      conditionCode: input.conditionCode,
      supplier: input.supplier,
      receiptRefs: input.receiptRefs,
      quantity: 1,
      assetHealthStatus: healthEnum(input.assetHealthStatus),
      entryMode: input.entryMode === "legacy" ? EntryMode.legacy : EntryMode.year_setup,
      firstTime: input.firstTime ?? input.entryMode !== "legacy",
    },
  });

  if (!opts?.skipChainRecalc) {
    await recalcRegisterChainInCategory(organizationId, year, cat.name);
  }
  return prisma.asset.findUniqueOrThrow({ where: { id: created.id } });
}

/** Bulk qty: roll opening → prior TB; keep year-start TD fixed (bug #1 fix). */
export async function registerAssetsBulkWithLedger(
  organizationId: string,
  input: Parameters<typeof registerAssetWithLedger>[1] & { quantity: number },
  opts?: { skipChainRecalc?: boolean }
) {
  const cat = await resolveCategory(organizationId, input.category);
  const year = Number(input.registerYear);
  const qty = Math.max(2, Math.min(100, Number(input.quantity) || 2));
  const openingCtx = await resolveCategoryOpeningContext(organizationId, {
    year,
    category: cat.name,
    entryMode: input.entryMode,
  });

  const yearStartTd = openingCtx.effective_accumulated_depreciation;
  let opening = openingCtx.effective_opening;
  const yearStartOpening = openingCtx.year_start_opening ?? openingCtx.effective_opening;
  let wipPricesInYear = [...(openingCtx.wip_purchase_prices_in_year ?? [])];
  let categoryPoolTb = openingCtx.category_total_balance ?? openingCtx.effective_opening;
  const createdIds: string[] = [];

  for (let i = 0; i < qty; i++) {
    const pp = Number(input.purchasePrice) || 0;
    const isWip =
      isBuildingsCategory(cat.name) &&
      normalizeBuildingStatus(input.buildingStatus) === "Working Progress";
    const allWipPP = isWip ? [...wipPricesInYear, pp].filter((n) => n > 0) : undefined;
    const poolTB = isWip && allWipPP?.length ? categoryPoolTb + pp : undefined;

    const math = computeAssetRegisterMath({
      opening,
      purchasePrice: pp,
      accumulatedStart: yearStartTd,
      rate: resolveRowDepRate(input.depRate ?? 0, openingCtx.depreciation_rate),
      categoryName: cat.name,
      buildingStatus: normalizeBuildingStatus(input.buildingStatus),
      isFirstInYear: openingCtx.assets_in_year === 0 && i === 0,
      priorSameAssetNetBook: openingCtx.prior_same_asset_net_book,
      yearStartOpening,
      allWipPurchasePricesInYear: allWipPP,
      categoryTotalBalance: isWip ? poolTB : undefined,
    });

    const assetCode = await nextAssetCode(organizationId, year);
    const sku = await buildSku(
      organizationId,
      input.locationLabel ?? "",
      `${input.labelTag ?? "AST"}${i + 1}`,
      year
    );

    const row = await prisma.asset.create({
      data: {
        organizationId,
        assetCode,
        assetName: `${input.assetName.trim()}${qty > 1 ? ` (${i + 1}/${qty})` : ""}`,
        sku,
        categoryName: cat.name,
        categoryId: cat.id,
        location: input.location ?? "",
        locationLabel: input.locationLabel ?? "",
        buildingStatus: toBuildingEnum(input.buildingStatus),
        registerYear: year,
        openingAmount: math.opening,
        unitPrice: math.purchasePrice,
        totalBalance: math.totalBalance,
        accumulatedDepreciation: math.accumulatedStart,
        depRate: math.rate,
        annualDep: math.annualDep,
        totalDep: math.totalDep,
        netBookValue: math.netBookValue,
        applyTax: input.applyTax !== false,
        taxAmount: input.applyTax !== false ? Math.round(math.purchasePrice * 0.18) : null,
        quantity: 1,
        assetHealthStatus: healthEnum(input.assetHealthStatus),
        entryMode: input.entryMode === "legacy" ? EntryMode.legacy : EntryMode.year_setup,
        purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : new Date(),
        conditionCode: input.conditionCode,
        receiptRefs: input.receiptRefs,
        serialNumber: input.serialNumber,
        labelTag: input.labelTag,
        supplier: input.supplier,
      },
    });
    createdIds.push(row.id);
    opening = math.totalBalance;
    categoryPoolTb = math.totalBalance;
    if (isWip) {
      wipPricesInYear.push(math.purchasePrice);
    }
  }

  if (!opts?.skipChainRecalc) {
    await recalcRegisterChainInCategory(organizationId, year, cat.name);
  }
  return prisma.asset.findMany({ where: { id: { in: createdIds } }, orderBy: { id: "asc" } });
}

export async function listRegister(
  organizationId: string,
  query: {
    page?: number;
    limit?: number;
    registerYear?: number;
    category?: string;
    assetHealthStatus?: string;
    q?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 30));
  const where = {
    organizationId,
    deletedAt: null as null,
    ...(query.registerYear ? { registerYear: Number(query.registerYear) } : {}),
    ...(query.category
      ? { categoryName: { equals: query.category, mode: "insensitive" as const } }
      : {}),
    ...(query.assetHealthStatus
      ? { assetHealthStatus: healthEnum(query.assetHealthStatus) }
      : {}),
    ...(query.q
      ? {
          OR: [
            { assetName: { contains: query.q, mode: "insensitive" as const } },
            { assetCode: { contains: query.q, mode: "insensitive" as const } },
            { sku: { contains: query.q, mode: "insensitive" as const } },
            { location: { contains: query.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.asset.count({ where }),
    prisma.asset.findMany({
      where,
      orderBy: [{ registerYear: "desc" }, { categoryName: "asc" }, { id: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  // Enrich within each category-year using full chain; pass prior-year WIP NBV for year-carry.
  // When manual adjustments exist, recalc has already persisted correct DB values — do not overwrite.
  const keys = [...new Set(rows.map((r) => `${r.categoryName}::${r.registerYear}`))];
  const adjustedCategoryYears = await findCategoryYearsWithAdjustments(organizationId, keys);
  const enrichedMap = new Map<string, (typeof rows)[0]>();
  for (const key of keys) {
    if (adjustedCategoryYears.has(key)) continue;

    const [categoryName, yearStr] = key.split("::");
    const year = Number(yearStr);
    const chain = await prisma.asset.findMany({
      where: {
        organizationId,
        categoryName,
        registerYear: year,
        deletedAt: null,
      },
      orderBy: { id: "asc" },
    });
    let priorYearWipNetBookByAsset: Map<string, number> | undefined;
    if (isBuildingsCategory(categoryName)) {
      priorYearWipNetBookByAsset = new Map();
      const priorWip = await prisma.asset.findMany({
        where: {
          organizationId,
          categoryName,
          registerYear: year - 1,
          deletedAt: null,
          buildingStatus: BuildingStatus.WorkingProgress,
        },
        select: { assetName: true, netBookValue: true },
      });
      for (const a of priorWip) {
        priorYearWipNetBookByAsset.set(
          `${categoryName}::${normalizeAssetName(a.assetName)}`,
          a.netBookValue
        );
      }
    }
    const { yearStartOpening, yearStartTd, depreciationRate } =
      await resolveYearStartChainAnchors(organizationId, year, categoryName);
    const chainKey = `${categoryName}::${year}`;
    for (const e of enrichRegisterChainFinancials(chain, {
      yearStartTdByKey: new Map([[chainKey, yearStartTd]]),
      yearStartOpeningByKey: new Map([[chainKey, yearStartOpening]]),
      yearStartRateByKey: new Map([[chainKey, depreciationRate]]),
      priorYearWipNetBookByAsset,
    })) {
      enrichedMap.set(e.id, e);
    }
  }

  const data = rows.map((r) => enrichedMap.get(r.id) ?? r);
  return { data, page, limit, total, totalPages: Math.ceil(total / limit) };
}

export async function getRegisterStats(organizationId: string, registerYear?: number) {
  const where = {
    organizationId,
    deletedAt: null as null,
    ...(registerYear ? { registerYear } : {}),
  };
  const assets = await prisma.asset.findMany({ where });
  const years = new Set(assets.map((a) => a.registerYear));
  return {
    totalAssets: assets.length,
    totalPurchase: assets.reduce((s, a) => s + a.unitPrice, 0),
    totalBalance: assets.reduce((s, a) => s + a.totalBalance, 0),
    totalAnnualDep: assets.reduce((s, a) => s + a.annualDep, 0),
    totalNetBook: assets.reduce((s, a) => s + a.netBookValue, 0),
    registerYears: years.size,
    byCategory: Object.entries(
      assets.reduce(
        (acc, a) => {
          acc[a.categoryName] = (acc[a.categoryName] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      )
    ).map(([label, value]) => ({ label, value })),
  };
}

export async function updateRegisterAsset(
  organizationId: string,
  id: string,
  input: Partial<{
    assetName: string;
    location: string;
    locationLabel: string;
    purchasePrice: number;
    buildingStatus: string;
    assetHealthStatus: string;
    supplier: string;
    serialNumber: string;
    labelTag: string;
    conditionCode: string;
    receiptRefs: string;
    applyTax: boolean;
    purchaseDate: string;
    sku: string;
    saleBalance?: number;
    applySaleBalance?: boolean;
    landProvince?: string | null;
    landDistrict?: string | null;
    landSector?: string | null;
    landCellule?: string | null;
    landVillage?: string | null;
    landUpi?: string | null;
  }>
) {
  const asset = await prisma.asset.findFirst({
    where: { id, organizationId, deletedAt: null },
  });
  if (!asset) throw new AppError(404, "Asset not found");

  if (input.sku?.trim() && input.sku.trim() !== asset.sku) {
    const check = await checkRegisterIdentifiers(organizationId, {
      registerYear: asset.registerYear,
      sku: input.sku,
      excludeId: id,
    });
    if (!check.available) throw new AppError(409, `SKU already exists for year ${asset.registerYear}`);
  }

  await prisma.asset.update({
    where: { id },
    data: {
      ...(input.assetName !== undefined ? { assetName: input.assetName } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.locationLabel !== undefined
        ? { locationLabel: input.locationLabel.toUpperCase() }
        : {}),
      ...(input.purchasePrice !== undefined ? { unitPrice: Number(input.purchasePrice) } : {}),
      ...(input.buildingStatus !== undefined
        ? { buildingStatus: toBuildingEnum(input.buildingStatus) }
        : {}),
      ...(input.assetHealthStatus !== undefined
        ? { assetHealthStatus: healthEnum(input.assetHealthStatus) }
        : {}),
      ...(input.supplier !== undefined ? { supplier: input.supplier } : {}),
      ...(input.serialNumber !== undefined ? { serialNumber: input.serialNumber } : {}),
      ...(input.labelTag !== undefined ? { labelTag: input.labelTag } : {}),
      ...(input.conditionCode !== undefined ? { conditionCode: input.conditionCode } : {}),
      ...(input.receiptRefs !== undefined ? { receiptRefs: input.receiptRefs } : {}),
      ...(input.applyTax !== undefined ? { applyTax: Boolean(input.applyTax) } : {}),
      ...(input.purchaseDate !== undefined
        ? { purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : null }
        : {}),
      ...(input.sku !== undefined ? { sku: input.sku.trim() } : {}),
      ...assetPayloadFields({
        saleBalance: input.saleBalance,
        applySaleBalance: input.applySaleBalance,
        landProvince: input.landProvince,
        landDistrict: input.landDistrict,
        landSector: input.landSector,
        landCellule: input.landCellule,
        landVillage: input.landVillage,
        landUpi: input.landUpi,
      }),
    },
  });

  await recalcRegisterChainInCategory(organizationId, asset.registerYear, asset.categoryName);
  return prisma.asset.findUniqueOrThrow({ where: { id } });
}

export async function softDeleteAsset(organizationId: string, id: string) {
  const asset = await prisma.asset.findFirst({
    where: { id, organizationId, deletedAt: null },
  });
  if (!asset) throw new AppError(404, "Asset not found");
  await prisma.asset.update({ where: { id }, data: { deletedAt: new Date() } });
  await recalcRegisterChainInCategory(organizationId, asset.registerYear, asset.categoryName);
  return { success: true };
}

export async function bulkDeleteAssets(organizationId: string, ids: string[]) {
  const assets = await prisma.asset.findMany({
    where: { organizationId, id: { in: ids }, deletedAt: null },
  });
  await prisma.asset.updateMany({
    where: { organizationId, id: { in: ids } },
    data: { deletedAt: new Date() },
  });
  const keys = [...new Set(assets.map((a) => `${a.registerYear}::${a.categoryName}`))];
  for (const key of keys) {
    const [year, category] = key.split("::");
    await recalcRegisterChainInCategory(organizationId, Number(year), category);
  }
  return { deleted: assets.length };
}

function registerDeleteWhere(
  organizationId: string,
  query: {
    registerYear?: number;
    category?: string;
    assetHealthStatus?: string;
    q?: string;
  }
) {
  return {
    organizationId,
    deletedAt: null as null,
    ...(query.registerYear ? { registerYear: Number(query.registerYear) } : {}),
    ...(query.category
      ? { categoryName: { equals: query.category, mode: "insensitive" as const } }
      : {}),
    ...(query.assetHealthStatus
      ? { assetHealthStatus: healthEnum(query.assetHealthStatus) }
      : {}),
    ...(query.q
      ? {
          OR: [
            { assetName: { contains: query.q, mode: "insensitive" as const } },
            { assetCode: { contains: query.q, mode: "insensitive" as const } },
            { sku: { contains: query.q, mode: "insensitive" as const } },
            { location: { contains: query.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

export async function countRegisterForDelete(
  organizationId: string,
  query: {
    registerYear?: number;
    category?: string;
    assetHealthStatus?: string;
    q?: string;
  }
) {
  return prisma.asset.count({ where: registerDeleteWhere(organizationId, query) });
}

export async function deleteAllRegisterAssets(
  organizationId: string,
  query: {
    registerYear?: number;
    category?: string;
    assetHealthStatus?: string;
    q?: string;
  }
) {
  const where = registerDeleteWhere(organizationId, query);
  const assets = await prisma.asset.findMany({
    where,
    select: { id: true, registerYear: true, categoryName: true },
  });
  if (assets.length === 0) return { deleted: 0 };

  await prisma.asset.updateMany({
    where: { id: { in: assets.map((a) => a.id) } },
    data: { deletedAt: new Date() },
  });

  const keys = [...new Set(assets.map((a) => `${a.registerYear}::${a.categoryName}`))];
  for (const key of keys) {
    const [year, category] = key.split("::");
    await recalcRegisterChainInCategory(organizationId, Number(year), category);
  }
  return { deleted: assets.length };
}

export async function importRegisterRows(
  organizationId: string,
  rows: Array<{
    assetName: string;
    category: string;
    registerYear: number;
    purchasePrice: number;
    location?: string;
    locationLabel?: string;
    buildingStatus?: string;
    assetHealthStatus?: string;
    sku?: string;
    supplier?: string;
    depRate?: number;
    saleBalance?: number;
    applySaleBalance?: boolean;
    landProvince?: string | null;
    landDistrict?: string | null;
    landSector?: string | null;
    landCellule?: string | null;
    landVillage?: string | null;
    landUpi?: string | null;
  }>,
  opts?: {
    registerYear?: number;
    entryMode?: "year_setup" | "legacy";
    firstTime?: boolean;
    skipDuplicates?: boolean;
    autoGenerateSku?: boolean;
  }
) {
  const skipDuplicates = opts?.skipDuplicates !== false;
  const autoGenerateSku = opts?.autoGenerateSku !== false;
  const entryMode = opts?.entryMode ?? (opts?.firstTime === false ? "legacy" : "year_setup");
  const firstTime = opts?.firstTime ?? entryMode !== "legacy";
  const batchYear = opts?.registerYear;

  const activeYearRow = await prisma.financialYear.findFirst({
    where: { organizationId, status: "Active" },
    select: { year: true },
  });
  const activeYear = activeYearRow?.year ?? null;

  let imported = 0;
  let skipped = 0;
  let failed = 0;
  const errors: Array<{ row: number; message: string }> = [];
  const created = [];

  // Sort by category then year for chain order
  const ordered = rows
    .map((r, i) => ({ ...r, _i: i }))
    .sort((a, b) => {
      const ca = a.category.localeCompare(b.category);
      if (ca !== 0) return ca;
      return (a.registerYear || 0) - (b.registerYear || 0);
    });

  for (const row of ordered) {
    const year = Number(row.registerYear || batchYear);
    const useLegacy =
      entryMode === "legacy" ||
      firstTime === false ||
      (activeYear != null && year !== activeYear);
    const rowEntryMode = useLegacy ? "legacy" : "year_setup";
    const rowFirstTime = !useLegacy;

    try {
      if (row.sku?.trim()) {
        const check = await checkRegisterIdentifiers(organizationId, {
          registerYear: year,
          sku: row.sku,
        });
        if (!check.available) {
          if (skipDuplicates) {
            skipped += 1;
            continue;
          }
          throw new AppError(409, `Duplicate SKU ${row.sku}`);
        }
      }

      const result = await registerAssetWithLedger(
        organizationId,
        {
          assetName: row.assetName,
          category: row.category,
          registerYear: year,
          purchasePrice: row.purchasePrice,
          location: row.location?.trim() || "Imported",
          locationLabel: (row.locationLabel?.trim() || "IMP").toUpperCase(),
          buildingStatus: row.buildingStatus,
          assetHealthStatus: row.assetHealthStatus,
          depRate: row.depRate,
          saleBalance: row.saleBalance,
          applySaleBalance: row.applySaleBalance,
          landProvince: row.landProvince,
          landDistrict: row.landDistrict,
          landSector: row.landSector,
          landCellule: row.landCellule,
          landVillage: row.landVillage,
          landUpi: row.landUpi,
          skuMode: row.sku?.trim() ? "manual" : autoGenerateSku ? "auto" : "auto",
          sku: row.sku?.trim() || undefined,
          supplier: row.supplier,
          quantity: 1,
          entryMode: rowEntryMode,
          firstTime: rowFirstTime,
          applyTax: false,
        },
        { skipChainRecalc: true }
      );
      created.push(result);
      imported += 1;
    } catch (err) {
      failed += 1;
      errors.push({
        row: row._i + 1,
        message: err instanceof AppError ? err.message : "Import failed",
      });
    }
  }

  const recalcErrors: string[] = [];
  if (imported > 0) {
    const recalcKeys = [
      ...new Set(
        ordered
          .filter((r) => r.category)
          .map((r) => `${r.category}::${r.registerYear || batchYear}`)
      ),
    ].sort((a, b) => {
      const [ca, ya] = a.split("::");
      const [cb, yb] = b.split("::");
      const yearDiff = Number(ya) - Number(yb);
      if (yearDiff !== 0) return yearDiff;
      return ca.localeCompare(cb);
    });
    for (const key of recalcKeys) {
      const [category, yearStr] = key.split("::");
      try {
        await recalcRegisterChainInCategory(organizationId, Number(yearStr), category);
      } catch (err) {
        recalcErrors.push(
          `${category} ${yearStr}: ${err instanceof AppError ? err.message : "recalc failed"}`
        );
      }
    }
  }

  return {
    imported,
    skipped,
    failed,
    total: rows.length,
    errors,
    recalcErrors,
    data: created,
  };
}

function importCell(row: Record<string, unknown>, ...keys: string[]) {
  for (const k of keys) {
    const found = Object.keys(row).find(
      (h) => h.toLowerCase().replace(/[\s_]+/g, "") === k.toLowerCase().replace(/[\s_]+/g, "")
    );
    if (found != null && row[found] != null && String(row[found]).trim() !== "") {
      return String(row[found]).trim();
    }
  }
  return "";
}

function buildLandImportName(row: Record<string, unknown>): string {
  const direct = importCell(
    row,
    "name",
    "assetname",
    "asset_name",
    "asset name",
    "material",
    "description"
  );
  if (direct) return direct;

  const parts = [
    importCell(row, "province"),
    importCell(row, "district"),
    importCell(row, "sector"),
    importCell(row, "cellule", "cell"),
    importCell(row, "village"),
    importCell(row, "upi"),
  ].filter(Boolean);

  return parts.length ? `Land — ${parts.join(" / ")}` : "Land parcel";
}

function extractLandFieldsFromImport(row: Record<string, unknown>) {
  return {
    landProvince: importCell(row, "province") || null,
    landDistrict: importCell(row, "district") || null,
    landSector: importCell(row, "sector") || null,
    landCellule: importCell(row, "cellule", "cell") || null,
    landVillage: importCell(row, "village") || null,
    landUpi: importCell(row, "upi") || null,
  };
}

function landLocationFromFields(fields: ReturnType<typeof extractLandFieldsFromImport>) {
  const parts = [fields.landProvince, fields.landDistrict, fields.landSector].filter(Boolean);
  return parts.length ? parts.join(" / ") : "Land";
}

function assetPayloadFields(input: {
  saleBalance?: number;
  applySaleBalance?: boolean;
  landProvince?: string | null;
  landDistrict?: string | null;
  landSector?: string | null;
  landCellule?: string | null;
  landVillage?: string | null;
  landUpi?: string | null;
}) {
  return {
    ...(input.saleBalance !== undefined ? { saleBalance: Math.max(0, Number(input.saleBalance) || 0) } : {}),
    ...(input.applySaleBalance !== undefined
      ? { applySaleBalance: Boolean(input.applySaleBalance) }
      : {}),
    ...(input.landProvince !== undefined ? { landProvince: input.landProvince || null } : {}),
    ...(input.landDistrict !== undefined ? { landDistrict: input.landDistrict || null } : {}),
    ...(input.landSector !== undefined ? { landSector: input.landSector || null } : {}),
    ...(input.landCellule !== undefined ? { landCellule: input.landCellule || null } : {}),
    ...(input.landVillage !== undefined ? { landVillage: input.landVillage || null } : {}),
    ...(input.landUpi !== undefined ? { landUpi: input.landUpi || null } : {}),
  };
}

function allowsZeroPurchasePrice(categoryName: string) {
  return isLandCategory(categoryName) || isVehicleCategory(categoryName);
}

export type ImportPreviewRow = {
  row: number;
  status: "ready" | "duplicate" | "invalid";
  reason: string;
  assetName: string;
  category: string;
  typeRaw: string;
  registerYear: number;
  purchasePrice: number;
  location: string;
  locationLabel: string;
  sku: string;
  supplier: string;
  buildingStatus: string;
  opening: number;
  accumulatedStart: number;
  annualDep: number;
  totalBalance: number;
  netBookValue: number;
  depRate: number;
};

export async function previewImportRegisterRows(
  organizationId: string,
  input: {
    registerYear: number;
    entryMode?: "year_setup" | "legacy";
    firstTime?: boolean;
    rows: Array<Record<string, unknown>>;
  }
) {
  const categories = await listCategories(organizationId);
  const categoryNames = categories.map((c) => c.name);
  const batchYear = Number(input.registerYear);
  const entryMode = input.entryMode ?? (input.firstTime === false ? "legacy" : "year_setup");

  // Normalize raw excel rows (skip blank tail rows; exclude years before register start)
  let excludedBeforeMinYear = 0;
  const normalized = input.rows
    .filter((r) => !isEmptyImportRow(r))
    .map((r, idx) => {
    const sheetName = importCell(r, "_sheet", "__sheet");
    const sheetHint = sheetName ? sheetNameToTypeHint(sheetName) : "";
    const typeRaw = importCell(r, "type", "assettype", "asset type");
    const itemSubType = importCell(r, "category");
    const { category: mapped, resolvedType } = resolveImportCategory(
      typeRaw,
      sheetHint,
      categoryNames
    );
    const purchaseYear = Number(
      importCell(r, "purchaseyear", "purchase_year", "year", "registeryear") || batchYear
    );
    const price = Number(
      importCell(
        r,
        "purchaseunitprice",
        "purchase_unit_price",
        "purchaseprice",
        "purchase_price",
        "unitprice",
        "unit_price",
        "price"
      ) || 0
    );
    const saleRaw = importCell(r, "salebalance", "sale_balance", "sale balance");
    const saleBalance = Math.max(0, Number(saleRaw.replace(/,/g, "")) || 0);
    const applySaleBalance = saleBalance > 0;
    const landFields = mapped === "Land" || sheetHint === "LAND" ? extractLandFieldsFromImport(r) : null;
    let name = importCell(r, "name", "assetname", "asset_name", "asset name");
    const material = importCell(r, "material");
    if (!name && (mapped === "Land" || sheetHint === "LAND")) {
      name = buildLandImportName(r);
    }
    const assetName = name || material;
    const location =
      importCell(r, "location", "province", "district") ||
      (landFields ? landLocationFromFields(landFields) : "") ||
      "Imported";
    const label = (
      importCell(r, "label", "locationlabel", "location_label", "location label") ||
      landFields?.landUpi?.slice(0, 12) ||
      "IMP"
    ).toUpperCase();
    const sku = importCell(r, "sku", "serial", "serialnumber");
    const supplier = importCell(r, "supplier");
    let buildingStatus = importCell(r, "buildingstatus", "building_status", "wip") || "";
    if (
      !buildingStatus &&
      isBuildingsCategory(mapped ?? "") &&
      /dinning hall|dining hall|wip|progress|construction/i.test(assetName)
    ) {
      buildingStatus = "Working Progress";
    }
    const catDef = categories.find((c) => c.name === mapped);
    const depRate = parseImportDepRate(r, catDef?.depreciationRate ?? 0);
    return {
      row: idx + 1,
      assetName,
      typeRaw: resolvedType || typeRaw,
      category: mapped ?? "",
      registerYear: purchaseYear || batchYear,
      purchasePrice: price,
      saleBalance,
      applySaleBalance,
      ...landFields,
      depRate,
      location,
      locationLabel: label,
      sku,
      supplier,
      buildingStatus:
        buildingStatus.toLowerCase().includes("progress") || buildingStatus.toLowerCase() === "wip"
          ? "Working Progress"
          : buildingStatus.toLowerCase().includes("finish")
            ? "Finished"
            : "",
      sheetName,
      isOpeningBalance: isOpeningBalanceRow(assetName, itemSubType),
    };
  })
    .filter((n) => {
      if (isBeforeImportMinYear(n.registerYear)) {
        excludedBeforeMinYear += 1;
        return false;
      }
      return true;
    });

  // Existing SKUs / land UPI for duplicate check
  const years = [...new Set(normalized.map((n) => n.registerYear))];
  const existingSkus = new Set<string>();
  const existingLandUpis = new Set<string>();
  for (const y of years) {
    const assets = await prisma.asset.findMany({
      where: { organizationId, registerYear: y, deletedAt: null },
      select: { sku: true, landUpi: true, categoryName: true },
    });
    for (const a of assets) {
      if (a.sku) existingSkus.add(`${y}::${a.sku.toLowerCase()}`);
      if (isLandCategory(a.categoryName) && a.landUpi) {
        existingLandUpis.add(`${y}::${a.landUpi.toLowerCase()}`);
      }
    }
  }

  /** Land first parcel in a year needs Year Setup opening or prior-year register carry. */
  const landOpeningSourceCache = new Map<number, boolean>();
  async function landYearHasOpeningSource(year: number, category: string) {
    if (landOpeningSourceCache.has(year)) return landOpeningSourceCache.get(year)!;
    const chainAliases = await resolveCategoryChainAliases(organizationId, category);
    const [existingCount, priorYearLast, fyBal] = await Promise.all([
      prisma.asset.count({
        where: {
          organizationId,
          registerYear: year,
          categoryName: { in: chainAliases },
          deletedAt: null,
        },
      }),
      findPriorYearChainEnd(organizationId, year, chainAliases),
      findYearCategoryBalanceForChain(organizationId, year, category, chainAliases),
    ]);
    const ok = existingCount > 0 || !!priorYearLast || !!fyBal;
    landOpeningSourceCache.set(year, ok);
    return ok;
  }

  // Opening contexts per category-year
  const openingCache = new Map<
    string,
    Awaited<ReturnType<typeof resolveCategoryOpeningContext>>
  >();
  async function openingFor(category: string, year: number) {
    const key = `${category}::${year}`;
    if (!openingCache.has(key)) {
      openingCache.set(
        key,
        await resolveCategoryOpeningContext(organizationId, {
          year,
          category,
          entryMode,
        })
      );
    }
    return openingCache.get(key)!;
  }

  const batchCarry = new Map<
    string,
    { lastTB: number; lastTotalDep: number; lastYear: number }
  >();
  const assetBatchCarry = new Map<
    string,
    { lastNBV: number; lastYear: number; wasWip: boolean }
  >();

  type PendingRow = (typeof normalized)[0] & {
    status: ImportPreviewRow["status"];
    reason: string;
  };

  const pending: PendingRow[] = [];
  let ready = 0;
  let duplicates = 0;
  let invalid = 0;

  const sorted = [...normalized].sort((a, b) => {
    const c = a.category.localeCompare(b.category);
    if (c !== 0) return c;
    return a.registerYear - b.registerYear || a.row - b.row;
  });

  for (const n of sorted) {
    const issues: string[] = [];
    if (
      isImportTemplateSampleRow({
        assetName: n.assetName,
        sku: n.sku,
        typeRaw: n.typeRaw,
      })
    ) {
      issues.push("Template sample row — remove from file before import");
    }
    if (n.isOpeningBalance) {
      issues.push("Opening balance row — enter values in Year Setup instead");
    }
    if (!n.assetName?.trim()) issues.push("Missing name");
    if (!n.category) {
      issues.push(
        n.typeRaw
          ? `Unknown type: ${n.typeRaw}${n.sheetName ? ` (sheet: ${n.sheetName})` : ""}`
          : `Missing type${n.sheetName ? ` — add type column or use a category sheet name (${n.sheetName})` : ""}`
      );
    }
    if (!(n.purchasePrice > 0)) {
      if (isLandCategory(n.category)) {
        if (n.purchasePrice < 0) {
          issues.push("Invalid purchase_unit_price");
        } else {
          issues.push(
            "Land requires purchase price — set opening in Year Setup; do not import zero-purchase carry rows"
          );
        }
      } else if (isVehicleCategory(n.category)) {
        if (n.purchasePrice < 0) issues.push("Invalid purchase_unit_price");
      } else {
        issues.push("Missing/invalid purchase_unit_price");
      }
    }
    if (!n.registerYear) issues.push("Missing year");
    if (isLandCategory(n.category) && n.purchasePrice > 0 && n.category) {
      const hasOpeningSource = await landYearHasOpeningSource(n.registerYear, n.category);
      if (!hasOpeningSource) {
        issues.push(
          `Set Land opening in Year Setup for ${n.registerYear} before importing parcels`
        );
      }
    }

    let status: ImportPreviewRow["status"] = "ready";
    let reason = "Ready to import";

    if (issues.length) {
      status = "invalid";
      reason = issues.join("; ");
      invalid += 1;
    } else if (n.sku && existingSkus.has(`${n.registerYear}::${n.sku.toLowerCase()}`)) {
      status = "duplicate";
      reason = `SKU already exists for ${n.registerYear}`;
      duplicates += 1;
    } else if (
      isLandCategory(n.category) &&
      n.landUpi &&
      existingLandUpis.has(`${n.registerYear}::${n.landUpi.toLowerCase()}`)
    ) {
      status = "duplicate";
      reason = `UPI already exists for ${n.registerYear}`;
      duplicates += 1;
    } else {
      ready += 1;
      if (n.sku) existingSkus.add(`${n.registerYear}::${n.sku.toLowerCase()}`);
      if (isLandCategory(n.category) && n.landUpi) {
        existingLandUpis.add(`${n.registerYear}::${n.landUpi.toLowerCase()}`);
      }
    }

    pending.push({ ...n, status, reason });
  }

  /** Computed math keyed by import row number */
  const mathByRow = new Map<number, RegisterMathResult & { depRate: number }>();

  const byCategoryYear = new Map<string, PendingRow[]>();
  for (const row of pending) {
    if (row.status === "invalid" || !row.category) continue;
    const key = `${row.category}::${row.registerYear}`;
    const list = byCategoryYear.get(key) ?? [];
    list.push(row);
    byCategoryYear.set(key, list);
  }

  const yearStartMeta = new Map<
    string,
    { opening: number; accumulated: number; source: string }
  >();

  const sortedYearKeys = [...byCategoryYear.keys()].sort((a, b) => {
    const [ca, ya] = a.split("::");
    const [cb, yb] = b.split("::");
    const yearDiff = Number(ya) - Number(yb);
    if (yearDiff !== 0) return yearDiff;
    return ca.localeCompare(cb);
  });

  for (const yearKey of sortedYearKeys) {
    const [category, yearStr] = yearKey.split("::");
    const year = Number(yearStr);
    const catKey = getCategoryChainKey(category);
    const group = byCategoryYear.get(yearKey)!;
    const carry = batchCarry.get(catKey);

    const anchors = await resolveYearStartChainAnchors(organizationId, year, category);
    let opening = anchors.yearStartOpening;
    let td = anchors.yearStartTd;
    const ctx = await openingFor(category, year);
    let sourceLabel = ctx.source_label || ctx.source || "Year setup / prior register";

    if (carry && carry.lastYear === year - 1) {
      opening = carry.lastTB;
      td = carry.lastTotalDep;
      sourceLabel = `Carried forward from ${year - 1} (import chain)`;
    }

    yearStartMeta.set(yearKey, { opening, accumulated: td, source: sourceLabel });

    const chainRows: WipYearRow[] = [];
    const rowNums: number[] = [];

    for (let i = 0; i < group.length; i++) {
      const n = group[i];
      const isFirst = i === 0;
      const isWip =
        isBuildingsCategory(category) && n.buildingStatus === "Working Progress";

      let priorSameAssetNetBook: number | null = null;
      if (isFirst && isWip) {
        const assetKey = `${category}::${normalizeAssetName(n.assetName)}`;
        const ac = assetBatchCarry.get(assetKey);
        if (ac && ac.lastYear === year - 1 && ac.wasWip) {
          priorSameAssetNetBook = ac.lastNBV;
        } else {
          priorSameAssetNetBook = await resolvePriorSameAssetWipNetBook(
            organizationId,
            year,
            category,
            n.assetName
          );
        }
      }

      const chain = computeRegisterChainStep(opening, n.purchasePrice, {
        categoryName: category,
        saleBalance: n.saleBalance,
        applySaleBalance: n.applySaleBalance,
      });

      chainRows.push({
        isWip,
        purchasePrice: n.purchasePrice,
        chainOpening: chain.opening,
        chainTotalBalance: chain.totalBalance,
        accumulatedStart: td,
        rate: resolveRowDepRate(n.depRate ?? 0, anchors.depreciationRate),
        isFirstInYear: isFirst,
        priorSameAssetNetBook,
        saleBalance: n.saleBalance,
        applySaleBalance: n.applySaleBalance,
      });
      rowNums.push(n.row);

      opening = chain.totalBalance;
    }

    const yearStartOpening = yearStartMeta.get(yearKey)!.opening;
    const finalized = isBuildingsCategory(category)
      ? finalizeBuildingsYearFinancials(chainRows, yearStartOpening)
      : finalizeStandardYearFinancials(chainRows, category);

    finalized.forEach((math, idx) => {
      mathByRow.set(rowNums[idx], { ...math, depRate: math.rate });
      const n = group[idx];
      const isWip =
        isBuildingsCategory(category) && n.buildingStatus === "Working Progress";
      assetBatchCarry.set(`${category}::${normalizeAssetName(n.assetName)}`, {
        lastNBV: math.netBookValue,
        lastYear: year,
        wasWip: isWip,
      });
    });

    if (finalized.length) {
      const last = finalized[finalized.length - 1];
      batchCarry.set(catKey, {
        lastTB: last.totalBalance,
        lastTotalDep: last.totalDep,
        lastYear: year,
      });
    } else {
      const chainAliases = await resolveCategoryChainAliases(organizationId, category);
      const dbLast = await prisma.asset.findFirst({
        where: {
          organizationId,
          registerYear: year,
          categoryName: { in: chainAliases },
          deletedAt: null,
        },
        orderBy: { id: "desc" },
        select: { totalBalance: true, totalDep: true },
      });
      if (dbLast) {
        batchCarry.set(catKey, {
          lastTB: dbLast.totalBalance,
          lastTotalDep: dbLast.totalDep,
          lastYear: year,
        });
      }
    }
  }

  const previewRows: ImportPreviewRow[] = pending.map((n) => {
    const math = mathByRow.get(n.row);
    return {
      row: n.row,
      status: n.status,
      reason: n.reason,
      assetName: n.assetName,
      category: n.category,
      typeRaw: n.typeRaw,
      registerYear: n.registerYear,
      purchasePrice: n.purchasePrice,
      location: n.location,
      locationLabel: n.locationLabel,
      sku: n.sku,
      supplier: n.supplier,
      buildingStatus: n.buildingStatus,
      opening: math?.opening ?? 0,
      accumulatedStart: math?.accumulatedStart ?? 0,
      annualDep: math?.annualDep ?? 0,
      totalBalance: math?.totalBalance ?? n.purchasePrice,
      netBookValue: math?.netBookValue ?? 0,
      depRate: math?.depRate ?? 0,
    };
  });

  // Restore original row order for display
  previewRows.sort((a, b) => a.row - b.row);

  // Category opening summary
  const categorySummary: Array<{
    category: string;
    year: number;
    opening: number;
    accumulated: number;
    source: string;
    readyCount: number;
  }> = [];
  const seen = new Set<string>();
  for (const r of previewRows) {
    if (!r.category || r.status === "invalid") continue;
    const key = `${r.category}::${r.registerYear}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const meta = yearStartMeta.get(key);
    categorySummary.push({
      category: r.category,
      year: r.registerYear,
      opening: meta?.opening ?? 0,
      accumulated: meta?.accumulated ?? 0,
      source: meta?.source ?? "Year setup / prior register",
      readyCount: previewRows.filter(
        (x) => x.category === r.category && x.registerYear === r.registerYear && x.status === "ready"
      ).length,
    });
  }

  return {
    summary: {
      total: previewRows.length,
      ready,
      duplicates,
      invalid,
      excludedBeforeMinYear,
      minRegisterYear: IMPORT_MIN_REGISTER_YEAR,
      registerYear: batchYear,
      entryMode,
    },
    categorySummary,
    rows: previewRows,
  };
}

export async function purgeImportTemplateSampleAssets(organizationId: string) {
  let deleted = 0;
  for (const sample of IMPORT_TEMPLATE_SAMPLE_ROWS) {
    const result = await prisma.asset.updateMany({
      where: {
        organizationId,
        deletedAt: null,
        assetName: { equals: sample.name, mode: "insensitive" },
        ...(sample.sku
          ? { sku: { equals: sample.sku, mode: "insensitive" } }
          : {}),
      },
      data: { deletedAt: new Date() },
    });
    deleted += result.count;
  }
  return { deleted };
}

export async function getRegisterMeta(organizationId: string) {
  const [categories, years, active, assetYearRows] = await Promise.all([
    listCategories(organizationId),
    listFinancialYears(organizationId),
    getActiveFinancialYear(organizationId),
    prisma.asset.findMany({
      where: { organizationId, deletedAt: null },
      select: { registerYear: true },
      distinct: ["registerYear"],
      orderBy: { registerYear: "desc" },
    }),
  ]);
  return {
    categories,
    years,
    registerYears: assetYearRows.map((r) => r.registerYear),
    activeYear: active?.year ?? null,
  };
}

export async function recalcAll(organizationId: string, registerYear?: number) {
  const where = {
    organizationId,
    deletedAt: null as null,
    ...(registerYear ? { registerYear } : {}),
  };
  const groups = await prisma.asset.groupBy({
    by: ["registerYear", "categoryName"],
    where,
  });
  groups.sort((a, b) => a.registerYear - b.registerYear || a.categoryName.localeCompare(b.categoryName));
  for (const g of groups) {
    await recalcRegisterChainInCategory(organizationId, g.registerYear, g.categoryName);
  }
  return { groups: groups.length };
}

export async function scanLookup(organizationId: string | null, code?: string, id?: string) {
  const where = {
    deletedAt: null as null,
    ...(organizationId ? { organizationId } : {}),
    ...(id ? { id } : {}),
    ...(code
      ? {
          OR: [
            { assetCode: code },
            { sku: code },
            { serialNumber: code },
          ],
        }
      : {}),
  };
  const asset = await prisma.asset.findFirst({ where });
  if (!asset) throw new AppError(404, "Asset not found");
  return asset;
}
