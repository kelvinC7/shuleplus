"use client";

import { useState, type ReactNode } from "react";
import { Columns3, Search } from "lucide-react";
import { AvatarInitials } from "@/components/kazi-data-table";
import { AdvanceEligibilityBadge } from "./advance-eligibility-badge";
import { EmployeeActionsMenu, type EmployeeAction } from "./employee-actions-menu";
import type { AdminEmployee } from "./types";

export function formatTableSalary(amount?: number | null) {
  if (!amount || amount <= 0) return "—";
  return `RWF ${Math.round(amount).toLocaleString("en-US")}`;
}

export function EmployeeIdentityCell({
  employee,
  onView,
  className = "",
}: {
  employee: AdminEmployee;
  onView: () => void;
  className?: string;
}) {
  return (
    <button type="button" className={`flex min-w-0 items-center gap-3 text-left ${className}`} onClick={onView}>
      <AvatarInitials name={employee.fullName} photoUrl={employee.photoUrl} />
      <span className="min-w-0">
        <span className="block truncate font-semibold text-navy">{employee.fullName}</span>
        <span className="mt-0.5 block truncate text-xs text-muted">{employee.email || employee.phone || "No email"}</span>
      </span>
    </button>
  );
}

export function EmployeeMobileCard({
  employee,
  payrollEnabled,
  onAction,
}: {
  employee: AdminEmployee;
  payrollEnabled?: boolean;
  onAction: (action: EmployeeAction) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      <EmployeeIdentityCell employee={employee} onView={() => onAction("view")} />
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div>
          <dt className="text-muted">Employee ID</dt>
          <dd className="mt-0.5 font-mono text-[11px] font-medium text-navy">{employee.employeeCode}</dd>
        </div>
        <div>
          <dt className="text-muted">Department</dt>
          <dd className="mt-0.5 font-medium text-navy">{employee.department || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">Position</dt>
          <dd className="mt-0.5 font-medium text-navy">{employee.position || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">Monthly salary</dt>
          <dd className="mt-0.5 font-semibold text-navy">{formatTableSalary(employee.grossSalary)}</dd>
        </div>
      </dl>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <AdvanceEligibilityBadge status={employee.advanceEligibility} />
        <EmployeeActionsMenu employee={employee} payrollEnabled={payrollEnabled} onAction={onAction} />
      </div>
    </div>
  );
}

export function RosterSearchToolbar({
  search,
  onSearch,
  extra,
}: {
  search: string;
  onSearch: (value: string) => void;
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative min-w-0 flex-1">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          className="input h-11 rounded-2xl bg-slate-50 pl-10"
          placeholder="Search by name, ID, email, or department..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      {extra}
    </div>
  );
}

export function ColumnsMenu({
  options,
  visible,
  onToggle,
}: {
  options: Array<{ id: string; label: string }>;
  visible: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" className="btn-secondary h-11 px-3 text-xs" onClick={() => setOpen((v) => !v)}>
        <Columns3 size={14} />
        Columns
      </button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-10" aria-label="Close columns" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
            {options.map((opt) => (
              <label key={opt.id} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-navy hover:bg-slate-50">
                <input type="checkbox" checked={visible[opt.id] !== false} onChange={() => onToggle(opt.id)} />
                {opt.label}
              </label>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function exportEmployeesCsv(rows: AdminEmployee[], filename: string) {
  const header = ["Name", "Email", "Employee ID", "Department", "Position", "Monthly Salary", "Net Salary", "Status"];
  const body = rows.map((r) =>
    [r.fullName, r.email ?? "", r.employeeCode, r.department, r.position, r.grossSalary ?? "", r.netSalary, r.advanceEligibility ?? ""]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const blob = new Blob([[header.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
