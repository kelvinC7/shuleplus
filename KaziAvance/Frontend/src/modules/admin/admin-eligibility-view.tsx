"use client";

import { useMemo, useState } from "react";
import { Download, Filter, RefreshCw, ShieldCheck, Users, Wallet, Ban } from "lucide-react";
import { KaziPageLayout } from "@/components/kazi-page-layout";
import { KaziDataTable, type KaziTableColumn } from "@/components/kazi-data-table";
import { adminApi } from "@/services/admin-api";
import { PageError, PageLoader, useAsyncData } from "@/hooks/use-async-data";
import { useToast } from "@/shared/notifications";
import { EmployeeProfileDrawer } from "./employee-profile-drawer";
import { EmployeeActionsMenu, type EmployeeAction } from "./employee-actions-menu";
import { SetSalaryModal } from "./set-salary-modal";
import { EditEmployeeModal } from "./edit-employee-modal";
import { AdvanceEligibilityBadge } from "./advance-eligibility-badge";
import {
  ColumnsMenu,
  EmployeeIdentityCell,
  EmployeeMobileCard,
  RosterSearchToolbar,
  exportEmployeesCsv,
  formatTableSalary,
} from "./employee-roster";
import type { AdminEmployee } from "./types";

type SourceFilter = "all" | "timetable" | "hr" | "iam" | "teachers";

const FILTERS: Array<[SourceFilter, string]> = [
  ["all", "All"],
  ["teachers", "Teachers"],
  ["timetable", "Timetable"],
  ["hr", "HR"],
  ["iam", "Users & Access"],
];

export function AdminEligibilityView() {
  const { data: employees, loading, error, reload } = useAsyncData(
    () => adminApi.getEmployees().then((r) => r.data),
    []
  );
  const { data: dashboard } = useAsyncData(() => adminApi.getDashboard(), []);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<"overview" | "eligibility" | "account" | "advances" | "salary">("eligibility");
  const [salaryEmployee, setSalaryEmployee] = useState<AdminEmployee | null>(null);
  const [editEmployee, setEditEmployee] = useState<AdminEmployee | null>(null);
  const [profileTick, setProfileTick] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
    code: true,
    dept: true,
    pos: true,
    monthly: true,
    net: true,
    elig: true,
  });
  const toast = useToast();

  const payrollOn = dashboard?.hasPayrollIntegration ?? false;
  const rows = employees ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((emp) => {
      const sources = emp.directorySources ?? [];
      if (sourceFilter === "teachers") {
        if (!/teacher/i.test(emp.position) && !sources.includes("timetable")) return false;
      } else if (sourceFilter !== "all" && !sources.includes(sourceFilter)) {
        return false;
      }
      if (!q) return true;
      return [emp.fullName, emp.email, emp.phone, emp.position, emp.department, emp.employeeCode]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, search, sourceFilter]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  async function handleAction(employee: AdminEmployee, action: EmployeeAction) {
    if (action === "view") {
      setDrawerTab("overview");
      setSelectedId(employee.id);
      return;
    }
    if (action === "edit") {
      setEditEmployee(employee);
      return;
    }
    if (action === "salary") {
      setSalaryEmployee(employee);
      return;
    }
    if (action === "fetch-payroll") {
      try {
        await adminApi.fetchPayrollSalary(employee.id);
        toast.success("Salary synced from Payroll");
        await reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not fetch payroll salary");
      }
      return;
    }
    if (action === "eligibility") {
      setDrawerTab("eligibility");
      setSelectedId(employee.id);
      return;
    }
    if (action === "disable") {
      await adminApi.updateEligibility(employee.id, { allowAdvance: false, eligibilityStatus: "Disabled" });
      await reload();
      return;
    }
    if (action === "enable") {
      await adminApi.updateEligibility(employee.id, { allowAdvance: true, eligibilityStatus: "Eligible" });
      await reload();
      return;
    }
    if (action === "history-advances") {
      setDrawerTab("advances");
      setSelectedId(employee.id);
      return;
    }
    if (action === "history-salary") {
      setDrawerTab("salary");
      setSelectedId(employee.id);
    }
  }

  async function syncDirectory() {
    setSyncing(true);
    try {
      await adminApi.syncDirectory();
      if (payrollOn) await adminApi.syncPayrollSalaries();
      await reload();
    } finally {
      setSyncing(false);
    }
  }

  const columns: KaziTableColumn<AdminEmployee>[] = [
    {
      key: "name",
      header: "Employee",
      render: (r) => <EmployeeIdentityCell employee={r} onView={() => void handleAction(r, "view")} className="min-w-[220px]" />,
    },
    ...(visibleCols.code !== false
      ? [{ key: "code", header: "Employee ID", className: "hidden sm:table-cell", render: (r: AdminEmployee) => <span className="font-mono text-xs text-slate-600">{r.employeeCode}</span> }]
      : []),
    ...(visibleCols.dept !== false
      ? [{ key: "dept", header: "Department", className: "hidden md:table-cell", render: (r: AdminEmployee) => r.department || "—" }]
      : []),
    ...(visibleCols.pos !== false
      ? [{ key: "pos", header: "Position", className: "hidden lg:table-cell", render: (r: AdminEmployee) => r.position || "—" }]
      : []),
    ...(visibleCols.monthly !== false
      ? [{ key: "monthly", header: "Monthly Salary", render: (r: AdminEmployee) => <span className="font-medium">{formatTableSalary(r.grossSalary)}</span> }]
      : []),
    ...(visibleCols.net
      ? [{ key: "net", header: "Net Salary", className: "hidden xl:table-cell", render: (r: AdminEmployee) => formatTableSalary(r.netSalary) }]
      : []),
    ...(visibleCols.elig !== false
      ? [{ key: "status", header: "Status", render: (r: AdminEmployee) => <AdvanceEligibilityBadge status={r.advanceEligibility} /> }]
      : []),
    {
      key: "actions",
      header: "Actions",
      sticky: "right",
      className: "whitespace-nowrap",
      render: (r) => (
        <EmployeeActionsMenu
          employee={r}
          payrollEnabled={payrollOn || r.payrollEnabled}
          onAction={(action) => void handleAction(r, action)}
        />
      ),
    },
  ];

  if (loading && !employees) return <PageLoader />;
  if (error) return <PageError message={error} onRetry={reload} />;

  return (
    <>
      <KaziPageLayout
        kpis={[
          { label: "Total Employees", value: rows.length, hint: "People in this directory", icon: Users, iconClass: "bg-navy/10 text-navy" },
          { label: "Eligible", value: rows.filter((e) => e.advanceEligibility === "Eligible").length, hint: "Ready for salary advance", icon: ShieldCheck, iconClass: "bg-emerald-50 text-emerald-700" },
          { label: "Salary Missing", value: rows.filter((e) => (e.advanceEligibility ?? "").includes("Missing") || e.advanceEligibility === "Payroll Sync Required").length, hint: "Need salary before advances", icon: Wallet, iconClass: "bg-amber-50 text-amber-700" },
          { label: "Disabled", value: rows.filter((e) => e.advanceEligibility === "Disabled" || e.allowAdvance === false).length, hint: "Advance access turned off", icon: Ban, iconClass: "bg-slate-100 text-slate-600" },
        ]}
        actions={
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn-primary"
                disabled={syncing}
                onClick={() => {
                  setSyncing(true);
                  void (payrollOn ? adminApi.syncPayrollSalaries().then(() => reload()) : syncDirectory()).finally(() =>
                    setSyncing(false)
                  );
                }}
              >
                <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
                {payrollOn ? "Fetch from Payroll" : "Refresh directory"}
              </button>
              <p className="text-xs text-muted sm:text-sm">Employees synced from HR, Timetable & Users.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary text-xs" onClick={() => exportEmployeesCsv(filtered, "kaziavance-eligibility.csv")}>
                <Download size={14} />
                Export
              </button>
              <button type="button" className="btn-secondary text-xs" onClick={() => setShowFilters((v) => !v)}>
                <Filter size={14} />
                Filter
              </button>
            </div>
          </div>
        }
      >
        {showFilters ? (
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setSourceFilter(id);
                  setPage(1);
                }}
                className={sourceFilter === id ? "btn-primary text-xs" : "btn-secondary text-xs"}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}

        <KaziDataTable
          columns={columns}
          rows={paged}
          rowKey={(r) => r.id}
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          entityLabel="employees"
          emptyMessage="No teachers or staff found. Add people in Timetable, HR, or Users & Access, then refresh."
          mobileRow={(r) => (
            <EmployeeMobileCard employee={r} payrollEnabled={payrollOn || r.payrollEnabled} onAction={(action) => void handleAction(r, action)} />
          )}
          toolbar={
            <RosterSearchToolbar
              search={search}
              onSearch={(value) => {
                setSearch(value);
                setPage(1);
              }}
              extra={
                <div className="flex items-center gap-2">
                  <ColumnsMenu
                    options={[
                      { id: "code", label: "Employee ID" },
                      { id: "dept", label: "Department" },
                      { id: "pos", label: "Position" },
                      { id: "monthly", label: "Monthly Salary" },
                      { id: "net", label: "Net Salary" },
                      { id: "elig", label: "Status" },
                    ]}
                    visible={visibleCols}
                    onToggle={(id) => setVisibleCols((prev) => ({ ...prev, [id]: !prev[id] }))}
                  />
                  <select
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-medium text-navy"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    {[10, 25, 50].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              }
            />
          }
        />
      </KaziPageLayout>

      <EmployeeProfileDrawer
        employeeId={selectedId}
        hasHrIntegration={dashboard?.hasHrIntegration}
        initialTab={drawerTab}
        reloadToken={profileTick}
        onClose={() => setSelectedId(null)}
        onUpdated={() => void reload()}
        onSetSalary={(emp) => setSalaryEmployee(emp)}
        onEditEmployee={(emp) => setEditEmployee(emp)}
      />
      <SetSalaryModal
        employee={salaryEmployee}
        onClose={() => setSalaryEmployee(null)}
        onSaved={() => {
          toast.success("Salary saved. This employee can request Ticha Avance if eligible.");
          setProfileTick((n) => n + 1);
          void reload();
        }}
      />
      <EditEmployeeModal employee={editEmployee} onClose={() => setEditEmployee(null)} onSaved={() => void reload()} />
    </>
  );
}
