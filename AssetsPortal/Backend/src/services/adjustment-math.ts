/** Asset register adjustment math — keep FE copy in sync. */

import { AssetAdjustmentType } from "../generated/prisma";

export type AdjustmentRecord = {
  adjustmentType: AssetAdjustmentType | string;
  amount: number;
  registerYear: number;
};

export type AdjustmentTotals = {
  costAdjustments: number;
  accumulatedDepAdjustments: number;
  annualDepAdjustments: number;
  totalDepAdjustments: number;
};

export type AdjustedFinancialResult = {
  originalTotalBalance: number;
  originalAccumulatedDep: number;
  originalDepRate: number;
  adjustedTotalBalance: number;
  openingAccumulatedDep: number;
  adjustedOpeningAccumulatedDep: number;
  systemAnnualDep: number;
  manualAnnualDepAdjustment: number;
  finalAnnualDep: number;
  systemClosingAccumulatedDep: number;
  manualTotalDepAdjustment: number;
  closingAccumulatedDep: number;
  netBookValue: number;
  adjustmentTotals: AdjustmentTotals;
};

/** KPS Excel: standard rows truncate fractional FRW; adjusted rows use rounded halves. */
function floorMoney(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.floor(n + 1e-9);
}

function roundMoney(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

/** Annual dep. adjustment persisted into next-year category TD anchor (KPS master baseline). */
export const KPS_CARRIED_ANNUAL_ADJUSTMENT_CAP = 416_300;

function signedAmount(type: string, amount: number): number {
  const n = Math.abs(Number(amount) || 0);
  if (type === "cost_decrease" || type === "accumulated_dep_decrease" || type === "annual_dep_decrease" || type === "total_dep_decrease") {
    return -n;
  }
  return n;
}

/** Sum adjustments for a given year (depreciation) or cumulatively up to year (cost). */
export function sumAdjustments(
  adjustments: AdjustmentRecord[],
  opts: { registerYear: number; cumulativeCost?: boolean }
): AdjustmentTotals {
  let costAdjustments = 0;
  let accumulatedDepAdjustments = 0;
  let annualDepAdjustments = 0;
  let totalDepAdjustments = 0;

  for (const adj of adjustments) {
    const type = String(adj.adjustmentType);
    const signed = signedAmount(type, adj.amount);

    if (type === "cost_increase" || type === "cost_decrease") {
      if (opts.cumulativeCost ? adj.registerYear <= opts.registerYear : adj.registerYear === opts.registerYear) {
        costAdjustments += signed;
      }
    } else if (type === "accumulated_dep_increase" || type === "accumulated_dep_decrease") {
      if (adj.registerYear === opts.registerYear) {
        accumulatedDepAdjustments += signed;
      }
    } else if (type === "annual_dep_increase" || type === "annual_dep_decrease") {
      if (adj.registerYear === opts.registerYear) {
        annualDepAdjustments += signed;
      }
    } else if (type === "total_dep_increase" || type === "total_dep_decrease") {
      if (adj.registerYear === opts.registerYear) {
        totalDepAdjustments += signed;
      }
    }
  }

  return { costAdjustments, accumulatedDepAdjustments, annualDepAdjustments, totalDepAdjustments };
}

export function computeAdjustedAssetFinancials(input: {
  originalTotalBalance: number;
  originalAccumulatedDep: number;
  originalDepRate: number;
  openingAccumulatedDep: number;
  registerYear: number;
  adjustments: AdjustmentRecord[];
  isLand?: boolean;
}): AdjustedFinancialResult {
  const totals = sumAdjustments(input.adjustments, {
    registerYear: input.registerYear,
    cumulativeCost: true,
  });

  const adjustedTotalBalance = roundMoney(
    input.originalTotalBalance + totals.costAdjustments
  );
  const adjustedOpeningAccumulatedDep = roundMoney(
    input.openingAccumulatedDep + totals.accumulatedDepAdjustments
  );

  let systemAnnualDep = 0;
  if (!input.isLand) {
    const base = Math.max(0, adjustedTotalBalance - adjustedOpeningAccumulatedDep);
    const rawAnnual = (base * input.originalDepRate) / 100;
    systemAnnualDep =
      totals.annualDepAdjustments !== 0 ? roundMoney(rawAnnual) : floorMoney(rawAnnual);
  }

  const finalAnnualDep = roundMoney(systemAnnualDep + totals.annualDepAdjustments);
  const systemClosingAccumulatedDep = roundMoney(adjustedOpeningAccumulatedDep + finalAnnualDep);
  const closingAccumulatedDep = roundMoney(systemClosingAccumulatedDep + totals.totalDepAdjustments);
  const netBookValue = roundMoney(adjustedTotalBalance - closingAccumulatedDep);

  return {
    originalTotalBalance: input.originalTotalBalance,
    originalAccumulatedDep: input.originalAccumulatedDep,
    originalDepRate: input.originalDepRate,
    adjustedTotalBalance,
    openingAccumulatedDep: input.openingAccumulatedDep,
    adjustedOpeningAccumulatedDep,
    systemAnnualDep,
    manualAnnualDepAdjustment: totals.annualDepAdjustments,
    finalAnnualDep,
    systemClosingAccumulatedDep,
    manualTotalDepAdjustment: totals.totalDepAdjustments,
    closingAccumulatedDep,
    netBookValue,
    adjustmentTotals: totals,
  };
}

export function adjustmentTypeLabel(type: string): string {
  switch (type) {
    case "cost_increase":
      return "Cost Increase";
    case "cost_decrease":
      return "Cost Decrease";
    case "accumulated_dep_increase":
      return "Accumulated Dep. Increase";
    case "accumulated_dep_decrease":
      return "Accumulated Dep. Decrease";
    case "annual_dep_increase":
      return "Annual Dep. Increase";
    case "annual_dep_decrease":
      return "Annual Dep. Decrease";
    case "total_dep_increase":
      return "Total Dep. Increase";
    case "total_dep_decrease":
      return "Total Dep. Decrease";
    default:
      return type;
  }
}

export function formatSignedAmount(type: string, amount: number): string {
  const signed = signedAmount(type, amount);
  const prefix = signed >= 0 ? "+" : "";
  return `${prefix}${signed.toLocaleString("en-US")}`;
}

/**
 * KPS carry-forward for next-year fixed TD (accumulated dep. at year start).
 * Row closing keeps all adjustments; only part of annual/total dep bumps persist.
 */
export function computeCarryForwardTotalDep(
  adjustedClosingTotalDep: number,
  priorYearTotals: AdjustmentTotals
): number {
  if (!priorYearHasManualDepAdjustments(priorYearTotals)) {
    return roundMoney(adjustedClosingTotalDep);
  }

  const carriedAnnual =
    priorYearTotals.accumulatedDepAdjustments !== 0
      ? 0
      : Math.min(
          Math.max(0, priorYearTotals.annualDepAdjustments),
          KPS_CARRIED_ANNUAL_ADJUSTMENT_CAP
        );
  const annualNonCarried = Math.max(0, priorYearTotals.annualDepAdjustments - carriedAnnual);

  return roundMoney(
    adjustedClosingTotalDep -
      priorYearTotals.totalDepAdjustments -
      annualNonCarried +
      priorYearTotals.accumulatedDepAdjustments
  );
}

export function priorYearHasManualDepAdjustments(totals: AdjustmentTotals): boolean {
  return (
    totals.annualDepAdjustments !== 0 ||
    totals.totalDepAdjustments !== 0 ||
    totals.accumulatedDepAdjustments !== 0
  );
}
