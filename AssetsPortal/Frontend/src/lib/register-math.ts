/** Shared register depreciation math — keep FE copy in sync. */

export type BuildingStatusValue = "Finished" | "Working Progress" | null | undefined;

/** Normalize category / year-setup rate: 25 stays 25; decimal 0.25 → 25 (%). */
export function normalizeDepRatePercent(rate: number): number {
  const n = Number(rate) || 0;
  if (n <= 0) return 0;
  return n <= 1 ? n * 100 : n;
}

/** Asset row rate (e.g. Excel import) when set; otherwise year setup / category rate. */
export function resolveRowDepRate(assetDepRate: number, yearOrCategoryRate: number): number {
  const fromAsset = normalizeDepRatePercent(assetDepRate);
  if (fromAsset > 0) return fromAsset;
  return normalizeDepRatePercent(yearOrCategoryRate);
}

export interface RegisterMathInput {
  opening: number;
  purchasePrice: number;
  accumulatedStart: number;
  rate: number;
  categoryName: string;
  buildingStatus?: BuildingStatusValue;
  /** Same asset WIP net book from prior year (year-carry only when this is set). */
  priorSameAssetNetBook?: number | null;
  priorProgressPurchase?: number | null;
  isFirstInYear?: boolean;
  /** Category opening at start of year (first row opening). */
  yearStartOpening?: number | null;
  /** All WIP purchase prices in the same year (for scalable AD/NBV). */
  allWipPurchasePricesInYear?: number[];
  /** Category pool total balance (last row TB in year). */
  categoryTotalBalance?: number | null;
  /** Motor vehicle sale/disposal — reduces total balance when applySaleBalance is true. */
  saleBalance?: number;
  applySaleBalance?: boolean;
}

export interface RegisterMathResult {
  opening: number;
  purchasePrice: number;
  totalBalance: number;
  accumulatedStart: number;
  rate: number;
  annualDep: number;
  totalDep: number;
  netBookValue: number;
}

export function isLandCategory(name: string) {
  return name.trim().toLowerCase() === "land";
}

export function isVehicleCategory(name: string) {
  const n = name.trim().toLowerCase();
  return (
    n === "vehicles" ||
    n === "vehicle" ||
    n === "motor vehicle" ||
    n === "motor vehicles"
  );
}

export function computeRegisterTotalBalance(input: {
  opening: number;
  purchasePrice: number;
  categoryName: string;
  saleBalance?: number;
  applySaleBalance?: boolean;
}): number {
  const opening = Number(input.opening) || 0;
  const purchasePrice = Number(input.purchasePrice) || 0;
  let totalBalance = opening + purchasePrice;
  if (isVehicleCategory(input.categoryName) && input.applySaleBalance) {
    totalBalance -= Math.max(0, Number(input.saleBalance) || 0);
  }
  return totalBalance;
}

export function computeRegisterChainStep(
  opening: number,
  purchasePrice: number,
  opts?: { categoryName?: string; saleBalance?: number; applySaleBalance?: boolean }
) {
  const o = Number(opening) || 0;
  const pp = Number(purchasePrice) || 0;
  return {
    opening: o,
    purchasePrice: pp,
    totalBalance: computeRegisterTotalBalance({
      opening: o,
      purchasePrice: pp,
      categoryName: opts?.categoryName ?? "",
      saleBalance: opts?.saleBalance,
      applySaleBalance: opts?.applySaleBalance,
    }),
  };
}

export function isBuildingsCategory(name: string) {
  const n = name.trim().toLowerCase();
  return n === "buildings" || n === "building";
}

export function isWorkingProgressStatus(status?: string | null) {
  return normalizeBuildingStatus(status) === "Working Progress";
}

export function normalizeBuildingStatus(status?: string | null): BuildingStatusValue {
  if (!status) return null;
  const s = status.trim().toLowerCase();
  if (s === "finished") return "Finished";
  if (
    s === "working progress" ||
    s === "workingprogress" ||
    s === "working_progress" ||
    s === "wip" ||
    s === "in progress" ||
    s === "in_progress"
  ) {
    return "Working Progress";
  }
  return null;
}

function floorMoney(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.floor(n + 1e-9);
}

function roundMoney(n: number) {
  return floorMoney(n);
}

/** Sum of purchase prices for all other WIP buildings in the same year. */
export function sumOtherWipPurchasePrices(
  allWipPurchasePrices: number[],
  currentPurchasePrice: number
): number {
  const total = allWipPurchasePrices.reduce((s, p) => s + (Number(p) || 0), 0);
  return Math.max(0, total - (Number(currentPurchasePrice) || 0));
}

/**
 * WIP annual depreciation (scalable):
 * CurrentBuildingOpening = YearStartOpening − Sum(other WIP PP)
 * AD = (CurrentBuildingOpening − AccumulatedStart) × Rate
 */
export function computeWipBuildingAnnualDepreciation(
  yearStartOpening: number,
  accumulatedStart: number,
  rate: number,
  currentPurchasePrice: number,
  allWipPurchasePricesInYear: number[]
): number {
  const otherPP = sumOtherWipPurchasePrices(allWipPurchasePricesInYear, currentPurchasePrice);
  const currentBuildingOpening = yearStartOpening - otherPP;
  const base = Math.max(0, currentBuildingOpening - accumulatedStart);
  return roundMoney((base * rate) / 100);
}

/**
 * Scalable WIP NBV when multiple buildings share the same year pool:
 * NBV = Category TB − Sum(other WIP PP) − This building's Total Depreciation
 */
export function computeWipBuildingNetBookValue(
  categoryTotalBalance: number,
  currentPurchasePrice: number,
  allWipPurchasePricesInYear: number[],
  currentTotalDepreciation: number
): number {
  const otherPP = sumOtherWipPurchasePrices(allWipPurchasePricesInYear, currentPurchasePrice);
  return categoryTotalBalance - otherPP - currentTotalDepreciation;
}

export type WipYearRow = {
  isWip: boolean;
  purchasePrice: number;
  chainOpening: number;
  chainTotalBalance: number;
  accumulatedStart: number;
  rate: number;
  isFirstInYear: boolean;
  /** Prior year NBV for the same WIP asset (not category last asset). */
  priorSameAssetNetBook: number | null;
  saleBalance?: number;
  applySaleBalance?: boolean;
};

/** Chain-only step: roll opening → total balance without final AD/NBV. */
export function computeBuildingChainStep(opening: number, purchasePrice: number) {
  return computeRegisterChainStep(opening, purchasePrice);
}

/**
 * Final pass for one Buildings year: scalable WIP AD + NBV, Finished unchanged.
 * AD (WIP): (YearStartOpening − OtherWIPPP − TD) × Rate
 * Exception — same WIP project year-carry: AD = PriorSameAssetNBV × Rate
 * First year of a new WIP project: AD = (TB − TD) × Rate
 */
export function finalizeBuildingsYearFinancials(
  rows: WipYearRow[],
  yearStartOpening: number
): RegisterMathResult[] {
  const wipPrices = rows.filter((r) => r.isWip).map((r) => r.purchasePrice);
  const wipCount = wipPrices.length;
  const categoryTotalBalance = rows.length ? rows[rows.length - 1].chainTotalBalance : 0;

  return rows.map((row) => {
    const {
      isWip,
      purchasePrice,
      chainOpening: opening,
      chainTotalBalance: totalBalance,
      accumulatedStart,
      rate,
      isFirstInYear,
      priorSameAssetNetBook,
    } = row;

    if (!isWip) {
      const base =
        purchasePrice - accumulatedStart > 0
          ? purchasePrice - accumulatedStart
          : totalBalance - accumulatedStart;
      const annualDep = roundMoney((Math.max(0, base) * rate) / 100);
      const totalDep = accumulatedStart + annualDep;
      return {
        opening,
        purchasePrice,
        totalBalance,
        accumulatedStart,
        rate,
        annualDep,
        totalDep,
        netBookValue: totalBalance - totalDep,
      };
    }

    const priorSameNBV = priorSameAssetNetBook ?? 0;
    const isSameProjectYearCarry =
      isFirstInYear && priorSameNBV > 0 && wipCount === 1;

    let annualDep: number;
    if (isSameProjectYearCarry) {
      annualDep = roundMoney((priorSameNBV * rate) / 100);
    } else if (wipCount > 1) {
      annualDep = computeWipBuildingAnnualDepreciation(
        yearStartOpening,
        accumulatedStart,
        rate,
        purchasePrice,
        wipPrices
      );
    } else {
      const base = Math.max(0, totalBalance - accumulatedStart);
      annualDep = roundMoney((base * rate) / 100);
    }

    const totalDep = accumulatedStart + annualDep;

    let netBookValue: number;
    if (wipCount > 1) {
      netBookValue = computeWipBuildingNetBookValue(
        categoryTotalBalance,
        purchasePrice,
        wipPrices,
        totalDep
      );
    } else if (isSameProjectYearCarry) {
      netBookValue = priorSameNBV - annualDep;
    } else {
      netBookValue = totalBalance - totalDep;
    }

    return {
      opening,
      purchasePrice,
      totalBalance,
      accumulatedStart,
      rate,
      annualDep,
      totalDep,
      netBookValue,
    };
  });
}

/** @deprecated Use finalizeBuildingsYearFinancials */
export type WipNbvFinalizeRow = {
  isWip: boolean;
  purchasePrice: number;
  math: RegisterMathResult;
  isFirstInYear: boolean;
  priorYearNetBook: number | null;
};

export function normalizeAssetName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function finalizeBuildingsYearNetBookValues(
  rows: WipNbvFinalizeRow[],
  categoryTotalBalance: number
): RegisterMathResult[] {
  void categoryTotalBalance;
  return rows.map((row) => row.math);
}

/**
 * Standard categories (not Land / Buildings):
 * Annual Dep = (Total Balance − Accumulated Depreciation) × Rate%
 * e.g. (TB − TD) × 5%  — same as KPS (TB − TD) × decimal_depr
 */
export function computeStandardAnnualDep(
  totalBalance: number,
  accumulatedDepreciation: number,
  ratePercent: number
): number {
  const base = Math.max(0, totalBalance - accumulatedDepreciation);
  return roundMoney((base * ratePercent) / 100);
}

export function computeAssetRegisterMath(input: RegisterMathInput): RegisterMathResult {
  const opening = Number(input.opening) || 0;
  const purchasePrice = Number(input.purchasePrice) || 0;
  const accumulatedStart = Number(input.accumulatedStart) || 0;
  const rate = Number(input.rate) || 0;
  const totalBalance = computeRegisterTotalBalance({
    opening,
    purchasePrice,
    categoryName: input.categoryName,
    saleBalance: input.saleBalance,
    applySaleBalance: input.applySaleBalance,
  });

  if (isLandCategory(input.categoryName)) {
    return {
      opening,
      purchasePrice,
      totalBalance,
      accumulatedStart: 0,
      rate: 0,
      annualDep: 0,
      totalDep: 0,
      netBookValue: totalBalance,
    };
  }

  if (isBuildingsCategory(input.categoryName)) {
    return computeBuildingRegisterMath({
      ...input,
      opening,
      purchasePrice,
      accumulatedStart,
      rate,
      totalBalance,
    });
  }

  const annualDep = computeStandardAnnualDep(totalBalance, accumulatedStart, rate);
  const totalDep = accumulatedStart + annualDep;
  const netBookValue = totalBalance - totalDep;

  return {
    opening,
    purchasePrice,
    totalBalance,
    accumulatedStart,
    rate,
    annualDep,
    totalDep,
    netBookValue,
  };
}

function computeBuildingRegisterMath(
  input: RegisterMathInput & { totalBalance: number }
): RegisterMathResult {
  const {
    opening,
    purchasePrice,
    accumulatedStart,
    rate,
    totalBalance,
    buildingStatus,
    priorSameAssetNetBook,
    yearStartOpening,
    allWipPurchasePricesInYear,
    categoryTotalBalance,
  } = input;

  const status = normalizeBuildingStatus(buildingStatus) ?? "Finished";

  if (status === "Finished") {
    const base =
      purchasePrice - accumulatedStart > 0
        ? purchasePrice - accumulatedStart
        : totalBalance - accumulatedStart;
    const annualDep = roundMoney((Math.max(0, base) * rate) / 100);
    const totalDep = accumulatedStart + annualDep;
    return {
      opening,
      purchasePrice,
      totalBalance,
      accumulatedStart,
      rate,
      annualDep,
      totalDep,
      netBookValue: totalBalance - totalDep,
    };
  }

  const poolOpening = yearStartOpening ?? opening;
  const wipPrices = allWipPurchasePricesInYear ?? [];
  const wipCount = wipPrices.length;
  const priorSameNBV = Number(priorSameAssetNetBook) || 0;
  const isSameProjectYearCarry =
    Boolean(input.isFirstInYear) && priorSameNBV > 0 && wipCount <= 1;

  let annualDep: number;
  if (isSameProjectYearCarry) {
    annualDep = roundMoney((priorSameNBV * rate) / 100);
  } else if (wipCount > 1) {
    const prices = wipPrices.length > 0 ? wipPrices : [purchasePrice];
    annualDep = computeWipBuildingAnnualDepreciation(
      poolOpening,
      accumulatedStart,
      rate,
      purchasePrice,
      prices
    );
  } else {
    const base = Math.max(0, totalBalance - accumulatedStart);
    annualDep = roundMoney((base * rate) / 100);
  }

  const totalDep = accumulatedStart + annualDep;
  const poolTB = categoryTotalBalance ?? totalBalance;

  let netBookValue: number;
  if (wipCount > 1) {
    netBookValue = computeWipBuildingNetBookValue(
      poolTB,
      purchasePrice,
      wipPrices,
      totalDep
    );
  } else if (isSameProjectYearCarry) {
    netBookValue = priorSameNBV - annualDep;
  } else {
    netBookValue = totalBalance - totalDep;
  }

  return {
    opening,
    purchasePrice,
    totalBalance,
    accumulatedStart,
    rate,
    annualDep,
    totalDep,
    netBookValue,
  };
}

/** Standard / Land categories: AD = (TB − TD) × rate; Land has no depreciation. */
export function finalizeStandardYearFinancials(
  rows: WipYearRow[],
  categoryName: string
): RegisterMathResult[] {
  return rows.map((r) =>
    computeAssetRegisterMath({
      opening: r.chainOpening,
      purchasePrice: r.purchasePrice,
      accumulatedStart: r.accumulatedStart,
      rate: r.rate,
      categoryName,
      saleBalance: r.saleBalance,
      applySaleBalance: r.applySaleBalance,
    })
  );
}

export function computeYearStartAnnualDep(opening: number, accStart: number, rate: number) {
  return roundMoney((Math.max(0, opening - accStart) * rate) / 100);
}

export type EnrichChainOptions = {
  yearStartTdByKey?: Map<string, number>;
  yearStartOpeningByKey?: Map<string, number>;
  yearStartRateByKey?: Map<string, number>;
  priorYearWipNetBookByAsset?: Map<string, number>;
};

export function enrichRegisterChainFinancials<
  T extends {
    id: string;
    categoryName: string;
    registerYear: number;
    openingAmount: number;
    unitPrice: number;
    accumulatedDepreciation: number;
    depRate: number;
    buildingStatus?: BuildingStatusValue | string | null;
    annualDep?: number;
    totalDep?: number;
    totalBalance?: number;
    netBookValue?: number;
  },
>(
  rows: T[],
  opts?: EnrichChainOptions | Map<string, number>,
  priorYearWipNetBookByAsset?: Map<string, number>
): T[] {
  let yearStartTdByKey: Map<string, number> | undefined;
  let yearStartOpeningByKey: Map<string, number> | undefined;
  let yearStartRateByKey: Map<string, number> | undefined;
  let priorYearWip: Map<string, number> | undefined;
  if (opts instanceof Map) {
    yearStartTdByKey = opts;
    priorYearWip = priorYearWipNetBookByAsset;
  } else {
    yearStartTdByKey = opts?.yearStartTdByKey;
    yearStartOpeningByKey = opts?.yearStartOpeningByKey;
    yearStartRateByKey = opts?.yearStartRateByKey;
    priorYearWip = opts?.priorYearWipNetBookByAsset;
  }
  const sorted = [...rows].sort((a, b) => a.id.localeCompare(b.id));
  const byYear = new Map<number, T[]>();
  for (const row of sorted) {
    const list = byYear.get(row.registerYear) ?? [];
    list.push(row);
    byYear.set(row.registerYear, list);
  }

  const enrichedById = new Map<string, T>();

  for (const [, yearRows] of byYear) {
    if (!yearRows.length) continue;

    const isBuildings = isBuildingsCategory(yearRows[0].categoryName);
    const lastByKey = new Map<string, T>();
    const yearStartTd = new Map<string, number>(yearStartTdByKey);
    const lastByCategory = new Map<
      string,
      { netBookValue: number; totalDep: number; totalBalance: number; registerYear: number }
    >();
    const lastByAsset = new Map<
      string,
      { netBookValue: number; registerYear: number; wasWip: boolean }
    >();

    const chainRows: WipYearRow[] = [];
    const sourceRows: T[] = [];
    let yearStartOpening = 0;
    let yearStartTdValue = 0;

    for (const row of yearRows) {
      const key = `${row.categoryName}::${row.registerYear}`;
      const prev = lastByKey.get(key);
      let opening: number;
      let td: number;

      if (!prev) {
        opening = yearStartOpeningByKey?.get(key) ?? row.openingAmount;
        td = yearStartTdByKey?.get(key) ?? row.accumulatedDepreciation;
        yearStartTd.set(key, td);
        yearStartOpening = opening;
        yearStartTdValue = td;
      } else {
        opening = prev.totalBalance ?? prev.openingAmount + prev.unitPrice;
        td = yearStartTd.get(key) ?? row.accumulatedDepreciation;
      }

      const isFirstInYear = !prev;
      const isWip = isBuildings && isWorkingProgressStatus(row.buildingStatus as string);

      let priorSameAssetNetBook: number | null = null;
      if (isFirstInYear && isWip) {
        const assetName = normalizeAssetName(
          String((row as { assetName?: string }).assetName ?? "")
        );
        if (assetName) {
          const priorAsset = lastByAsset.get(`${row.categoryName}::${assetName}`);
          if (
            priorAsset &&
            priorAsset.registerYear === row.registerYear - 1 &&
            priorAsset.wasWip
          ) {
            priorSameAssetNetBook = priorAsset.netBookValue;
          } else if (priorYearWip) {
            const fromDb = priorYearWip.get(`${row.categoryName}::${assetName}`);
            if (fromDb != null) priorSameAssetNetBook = fromDb;
          }
        }
      }

      const rowWithSale = row as T & { saleBalance?: number; applySaleBalance?: boolean };
      const chain = computeRegisterChainStep(opening, row.unitPrice, {
        categoryName: row.categoryName,
        saleBalance: rowWithSale.saleBalance,
        applySaleBalance: rowWithSale.applySaleBalance,
      });
      const rate = resolveRowDepRate(row.depRate, yearStartRateByKey?.get(key) ?? 0);

      chainRows.push({
        isWip,
        purchasePrice: row.unitPrice,
        chainOpening: chain.opening,
        chainTotalBalance: chain.totalBalance,
        accumulatedStart: td,
        rate,
        isFirstInYear,
        priorSameAssetNetBook,
        saleBalance: rowWithSale.saleBalance,
        applySaleBalance: rowWithSale.applySaleBalance,
      });
      sourceRows.push(row);

      lastByKey.set(key, {
        ...row,
        openingAmount: chain.opening,
        totalBalance: chain.totalBalance,
      } as T);

      lastByCategory.set(row.categoryName, {
        netBookValue: 0,
        totalDep: td,
        totalBalance: chain.totalBalance,
        registerYear: row.registerYear,
      });
    }

    const finalized = isBuildings
      ? finalizeBuildingsYearFinancials(chainRows, yearStartOpening)
      : finalizeStandardYearFinancials(chainRows, yearRows[0].categoryName);

    finalized.forEach((math, idx) => {
      const row = sourceRows[idx];
      enrichedById.set(row.id, {
        ...row,
        openingAmount: math.opening,
        totalBalance: math.totalBalance,
        accumulatedDepreciation: math.accumulatedStart,
        depRate: math.rate,
        annualDep: math.annualDep,
        totalDep: math.totalDep,
        netBookValue: math.netBookValue,
      });

      lastByCategory.set(row.categoryName, {
        netBookValue: math.netBookValue,
        totalDep: math.totalDep,
        totalBalance: math.totalBalance,
        registerYear: row.registerYear,
      });

      const assetName = normalizeAssetName(
        String((row as { assetName?: string }).assetName ?? "")
      );
      if (assetName) {
        lastByAsset.set(`${row.categoryName}::${assetName}`, {
          netBookValue: math.netBookValue,
          registerYear: row.registerYear,
          wasWip: isBuildings && isWorkingProgressStatus(row.buildingStatus as string),
        });
      }
    });

    void yearStartTdValue;
  }

  return sorted.map((row) => enrichedById.get(row.id) ?? row);
}
