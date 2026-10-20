export const BUDGET_TYPES = [
  "Term Budget",
  "Annual Budget",
  "Department Budget",
  "Project Budget",
  "Emergency Budget",
  "Supplementary Budget",
] as const;

export const TERMS = ["Term 1", "Term 2", "Term 3", "Full Academic Year"] as const;

export const INCOME_PRESETS = [
  "Tuition Fees",
  "Boarding Fees",
  "Transport Fees",
  "Cafeteria Fees",
  "Grants & Donations",
  "Other Income",
] as const;

export const CATEGORIES = [
  "Academic",
  "Administration",
  "Operations",
  "Facilities",
  "Staff Welfare",
  "ICT",
  "Transport",
  "Contingency",
] as const;

export const DEPARTMENTS = [
  "Academics",
  "Administration",
  "Finance",
  "HR",
  "ICT",
  "Facilities",
  "Boarding",
  "Transport",
] as const;

export const PAYMENT_METHODS = [
  "Bank Transfer",
  "Mobile Money",
  "Cash",
  "Cheque",
  "Other",
] as const;

export const LARGE_EXPENSE_RWF = 5_000_000;

export function usageSeverity(used: number, planned: number) {
  if (planned <= 0) return "Active";
  const pct = (used / planned) * 100;
  if (pct >= 100) return "Exhausted";
  if (pct >= 90) return "Critical";
  if (pct >= 80) return "Warning";
  return "Active";
}

export function netFromConfig(input: {
  expectedAmountRwf?: number;
  configJson?: {
    calculationType?: string;
    quantity?: number;
    unitAmount?: number;
    deductions?: Array<{ amount?: number }>;
  } | null;
}) {
  const cfg = input.configJson ?? {};
  const deductions = (cfg.deductions ?? []).reduce((s, d) => s + (Number(d.amount) || 0), 0);
  if (cfg.calculationType === "per_student") {
    const gross = (Number(cfg.quantity) || 0) * (Number(cfg.unitAmount) || 0);
    return Math.max(0, gross - deductions);
  }
  const base = Number(input.expectedAmountRwf) || 0;
  return Math.max(0, base - deductions);
}
