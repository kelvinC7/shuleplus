import type { AdvanceEligibilityStatus, SalarySourceKind } from "@/modules/admin/types";

const ELIGIBILITY_STYLE: Record<AdvanceEligibilityStatus, string> = {
  Eligible: "bg-emerald-50 text-emerald-800",
  "Salary Missing": "bg-amber-50 text-amber-900",
  "Net Salary Missing": "bg-orange-50 text-orange-800",
  "Payroll Sync Required": "bg-sky-50 text-sky-800",
  "Not Eligible": "bg-red-50 text-red-700",
  "Advance Outstanding": "bg-violet-50 text-violet-800",
  Disabled: "bg-slate-100 text-slate-600",
};

const ELIGIBILITY_DOT: Record<AdvanceEligibilityStatus, string> = {
  Eligible: "bg-emerald-500",
  "Salary Missing": "bg-amber-500",
  "Net Salary Missing": "bg-orange-500",
  "Payroll Sync Required": "bg-sky-500",
  "Not Eligible": "bg-red-500",
  "Advance Outstanding": "bg-violet-500",
  Disabled: "bg-slate-400",
};

export function AdvanceEligibilityBadge({ status }: { status?: string }) {
  const key = (status || "Salary Missing") as AdvanceEligibilityStatus;
  const style = ELIGIBILITY_STYLE[key] ?? "bg-slate-100 text-slate-700";
  const dot = ELIGIBILITY_DOT[key] ?? "bg-slate-400";
  return (
    <span className={`badge inline-flex items-center gap-1.5 whitespace-nowrap ${style}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {status || "Salary Missing"}
    </span>
  );
}

const SOURCE_STYLE: Record<SalarySourceKind, string> = {
  payroll: "bg-emerald-50 text-emerald-800",
  kaziavance: "bg-sky-50 text-sky-800",
  missing: "bg-amber-50 text-amber-900",
  invalid: "bg-red-50 text-red-700",
};

const SOURCE_DOT: Record<SalarySourceKind, string> = {
  payroll: "bg-emerald-500",
  kaziavance: "bg-sky-500",
  missing: "bg-amber-500",
  invalid: "bg-red-500",
};

const SOURCE_LABEL: Record<SalarySourceKind, string> = {
  payroll: "Payroll",
  kaziavance: "KaziAvance",
  missing: "Missing",
  invalid: "Invalid",
};

export function SalarySourceBadge({ source }: { source?: SalarySourceKind | string | null }) {
  const key = (source ?? "missing") as SalarySourceKind;
  return (
    <span className={`badge inline-flex items-center gap-1.5 whitespace-nowrap ${SOURCE_STYLE[key] ?? SOURCE_STYLE.missing}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${SOURCE_DOT[key] ?? SOURCE_DOT.missing}`} />
      {SOURCE_LABEL[key] ?? SOURCE_LABEL.missing}
    </span>
  );
}

export function needsSalarySetup(status?: string) {
  return (
    status === "Salary Missing" ||
    status === "Net Salary Missing" ||
    status === "Payroll Sync Required"
  );
}
