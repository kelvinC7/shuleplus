/** Asset register adjustment math — keep in sync with Backend/src/services/adjustment-math.ts */

export type AdjustmentRecord = {
  adjustmentType: string;
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

function floorMoney(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.floor(n + 1e-9);
}

function roundMoney(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

function signedAmount(type: string, amount: number): number {
  const n = Math.abs(Number(amount) || 0);
  if (
    type === 'cost_decrease' ||
    type === 'accumulated_dep_decrease' ||
    type === 'annual_dep_decrease' ||
    type === 'total_dep_decrease'
  ) {
    return -n;
  }
  return n;
}

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

    if (type === 'cost_increase' || type === 'cost_decrease') {
      if (opts.cumulativeCost ? adj.registerYear <= opts.registerYear : adj.registerYear === opts.registerYear) {
        costAdjustments += signed;
      }
    } else if (type === 'accumulated_dep_increase' || type === 'accumulated_dep_decrease') {
      if (adj.registerYear === opts.registerYear) {
        accumulatedDepAdjustments += signed;
      }
    } else if (type === 'annual_dep_increase' || type === 'annual_dep_decrease') {
      if (adj.registerYear === opts.registerYear) {
        annualDepAdjustments += signed;
      }
    } else if (type === 'total_dep_increase' || type === 'total_dep_decrease') {
      if (adj.registerYear === opts.registerYear) {
        totalDepAdjustments += signed;
      }
    }
  }

  return { costAdjustments, accumulatedDepAdjustments, annualDepAdjustments, totalDepAdjustments };
}

export function adjustmentTypeLabel(type: string): string {
  switch (type) {
    case 'cost_increase':
      return 'Cost Increase';
    case 'cost_decrease':
      return 'Cost Decrease';
    case 'accumulated_dep_increase':
      return 'Accumulated Dep. Increase';
    case 'accumulated_dep_decrease':
      return 'Accumulated Dep. Decrease';
    case 'annual_dep_increase':
      return 'Annual Dep. Increase';
    case 'annual_dep_decrease':
      return 'Annual Dep. Decrease';
    case 'total_dep_increase':
      return 'Total Dep. Increase';
    case 'total_dep_decrease':
      return 'Total Dep. Decrease';
    default:
      return type;
  }
}

export const ADJUSTMENT_TYPE_OPTIONS = [
  { value: 'cost_increase', label: 'Increase Asset Cost', group: 'Cost' },
  { value: 'cost_decrease', label: 'Decrease Asset Cost', group: 'Cost' },
  { value: 'accumulated_dep_increase', label: 'Increase Accumulated Depreciation', group: 'Depreciation' },
  { value: 'accumulated_dep_decrease', label: 'Decrease Accumulated Depreciation', group: 'Depreciation' },
  { value: 'annual_dep_increase', label: 'Increase Annual Depreciation', group: 'Depreciation' },
  { value: 'annual_dep_decrease', label: 'Decrease Annual Depreciation', group: 'Depreciation' },
  { value: 'total_dep_increase', label: 'Increase Total Depreciation', group: 'Depreciation' },
  { value: 'total_dep_decrease', label: 'Decrease Total Depreciation', group: 'Depreciation' },
] as const;
