export interface LineItemAdjust {
  name: string;
  amount: number;
  channel?: string;
}

export interface EmployeeAdjustment {
  excluded?: boolean;
  basicSalaryOverride?: number;
  transportOverride?: number;
  housingOverride?: number;
  othersOverride?: number;
  mealOverride?: number;
  extraAllowances?: LineItemAdjust[];
  extraDeductions?: LineItemAdjust[];
}

export interface RunOverrides {
  runAllowances?: LineItemAdjust[];
  runDeductions?: LineItemAdjust[];
  employeeAdjustments?: Record<string, EmployeeAdjustment>;
}

export function emptyRunOverrides(): RunOverrides {
  return { runAllowances: [], runDeductions: [], employeeAdjustments: {} };
}
