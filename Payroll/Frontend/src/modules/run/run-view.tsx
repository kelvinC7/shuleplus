'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Download,
  Eye,
  FileSpreadsheet,
  Play,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  Users,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { MONTHS, formatRwf } from '@/config/payroll-nav';
import { payrollApi, type PayrollStaff } from '@/services/payroll-api';
import { useToast, useConfirm } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { emptyRunOverrides, type EmployeeAdjustment, type RunOverrides } from '@/types/run-overrides';
import {
  academicYearFromSettings,
  termFromSettings,
  type PayrollSettings,
} from '@/utils/academicCalendar';
import { StaffToProcessModal } from './staff-to-process-modal';
import { PayrollRunEmployeeDrawer } from './payroll-run-employee-drawer';
import { PayrollRunRegisterTable } from './payroll-run-register-table';
import {
  enrichRegisterRows,
  registerTotals,
  type EnrichedRegisterRow,
  type RegisterRow,
} from './payroll-run-types';

const WORKFLOW_STEPS = ['Draft', 'Preview', 'Validation', 'Approval', 'Processing', 'Bank Export', 'Completed'] as const;

function KpiCard({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[16px] border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-[#000435]">
        {icon}
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-[#000435]">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function AdvancedPanel({
  open,
  onClose,
  department,
  position,
  departments,
  positions,
  onDepartmentChange,
  onPositionChange,
  onReset,
  totalRows,
}: {
  open: boolean;
  onClose: () => void;
  department: string;
  position: string;
  departments: string[];
  positions: string[];
  onDepartmentChange: (v: string) => void;
  onPositionChange: (v: string) => void;
  onReset: () => void;
  totalRows: { label: string; value: number; emphasis?: boolean }[];
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[#000435]/15 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-sm flex-col bg-white shadow-[-8px_0_32px_-8px_rgba(0,4,53,0.2)] motion-safe:animate-fade-in-up">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-[#000435]">Advanced</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#000435]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Filters</p>
            <div className="space-y-2.5">
              <select className="input" value={department} onChange={(e) => onDepartmentChange(e.target.value)}>
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select className="input" value={position} onChange={(e) => onPositionChange(e.target.value)}>
                <option value="">All positions</option>
                {positions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={onReset}
                className="w-full rounded-xl border border-slate-200 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50"
              >
                Reset filters
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Payroll Totals</p>
            <div className="divide-y divide-slate-100">
              {totalRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-slate-500">{row.label}</span>
                  <span className={row.emphasis ? 'font-semibold text-[#000435]' : 'font-medium text-[#000435]'}>
                    {formatRwf(row.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RunView() {
  const now = new Date();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [preview, setPreview] = useState<{
    rows: RegisterRow[];
    totals: Record<string, number>;
    missingBasic: PayrollStaff[];
  } | null>(null);
  const [staffList, setStaffList] = useState<PayrollStaff[]>([]);
  const [staffIds, setStaffIds] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<RunOverrides>(emptyRunOverrides());
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [drawerRow, setDrawerRow] = useState<EnrichedRegisterRow | null>(null);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [workflowStep, setWorkflowStep] = useState(0);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [orgStartYear, setOrgStartYear] = useState<number | null>(null);
  const [payrollSettings, setPayrollSettings] = useState<PayrollSettings | null>(null);

  // Payroll periods are plain calendar month/year — not tied to any academic year/term.
  // Year range runs from whenever the organization started using the system through next year.
  // Assumption: settings payload exposes one of these fields for the org's start date —
  // adjust the field names below if your API uses a different shape.
  useEffect(() => {
    payrollApi
      .getSettings()
      .then(({ data }) => {
        const settings = data.data as PayrollSettings & Record<string, unknown>;
        setPayrollSettings(settings);
        const raw = settings.organizationFoundedYear ?? settings.createdAt ?? settings.organizationCreatedAt;
        if (typeof raw === 'number' && Number.isFinite(raw)) {
          setOrgStartYear(raw);
        } else if (typeof raw === 'string') {
          const parsed = new Date(raw).getFullYear();
          if (!Number.isNaN(parsed)) setOrgStartYear(parsed);
        }
      })
      .catch(() => undefined);
  }, []);

  const yearOptions = useMemo(() => {
    const current = now.getFullYear();
    // Fallback window (org start date not yet loaded, or field missing from settings).
    const start = orgStartYear ?? current - 5;
    const years: number[] = [];
    for (let y = current + 1; y >= start; y--) years.push(y);
    return years;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgStartYear]);

  const staffMap = useMemo(() => new Map(staffList.map((s) => [s.id, s])), [staffList]);

  const enrichedRows = useMemo(
    () => enrichRegisterRows(preview?.rows ?? [], staffMap),
    [preview?.rows, staffMap]
  );

  const departments = useMemo(
    () => [...new Set(enrichedRows.map((r) => r.department).filter(Boolean))] as string[],
    [enrichedRows]
  );
  const positions = useMemo(
    () => [...new Set(enrichedRows.map((r) => r.position).filter(Boolean))] as string[],
    [enrichedRows]
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enrichedRows.filter((r) => {
      if (q && !`${r.employeeName} ${r.employeeNumber} ${r.rssbNumber ?? ''}`.toLowerCase().includes(q)) return false;
      if (department && r.department !== department) return false;
      if (position && r.position !== position) return false;
      return true;
    });
  }, [enrichedRows, search, department, position]);

  const totals = useMemo(() => registerTotals(filteredRows), [filteredRows]);

  const validation = useMemo(() => {
    const missingBasic = preview?.missingBasic?.length ?? 0;
    const missingRssb = staffList.filter((s) => !s.rssbNumber).length;
    const missingBank = staffList.filter((s) => !s.bankAccount).length;
    const missingSalary = staffList.filter((s) => !s.basicSalary || s.basicSalary <= 0).length;
    return {
      missingBasic,
      missingRssb,
      missingBank,
      missingSalary,
      hasErrors: missingBasic > 0,
    };
  }, [preview?.missingBasic, staffList]);

  const loadPreview = useCallback(
    async (nextOverrides?: RunOverrides, nextStaffIds?: string[]) => {
      setLoading(true);
      const o = nextOverrides ?? overrides;
      const ids = nextStaffIds ?? staffIds;
      try {
        const { data } = await payrollApi.previewRun({
          month,
          year,
          ...(ids.length ? { staffIds: ids } : {}),
          overrides: o,
        });
        setPreview(data.data);
        setWorkflowStep(1);
        setPage(1);
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'Preview failed'), 'Preview failed');
      } finally {
        setLoading(false);
      }
    },
    [month, year, overrides, staffIds, toast]
  );

  useEffect(() => {
    payrollApi.listStaff().then((staffRes) => {
      setStaffList(staffRes.data.data as PayrollStaff[]);
    });
    void loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function trigger() {
    setTriggering(true);
    setWorkflowStep(4);
    try {
      const { data } = await payrollApi.triggerRun({
        month,
        year,
        academicYear: academicYearFromSettings(payrollSettings),
        term: termFromSettings(payrollSettings),
        ...(staffIds.length ? { staffIds } : {}),
        overrides,
      });
      toast.success(`Payroll run ${data.data.runNumber} created successfully.`, 'Payroll run created');
      setWorkflowStep(6);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Run failed'), 'Run failed');
      setWorkflowStep(validation.hasErrors ? 2 : 1);
    } finally {
      setTriggering(false);
    }
  }

  async function requestTrigger() {
    const ok = await confirm({
      title: 'Run payroll?',
      description: `Process payroll for ${MONTHS[month - 1]} ${year}? This creates a processing run for salary payment.`,
      confirmLabel: 'Run Payroll',
    });
    if (ok) await trigger();
  }

  function saveEmployeeAdj(staffId: string, adj: EmployeeAdjustment) {
    const next: RunOverrides = {
      ...overrides,
      employeeAdjustments: { ...(overrides.employeeAdjustments ?? {}), [staffId]: adj },
    };
    setOverrides(next);
    void loadPreview(next);
  }

  function addRunLine(list: 'runAllowances' | 'runDeductions') {
    setOverrides((o) => ({
      ...o,
      [list]: [...(o[list] ?? []), { name: list === 'runAllowances' ? 'Run Bonus' : 'Run Deduction', amount: 0 }],
    }));
  }

  function updateRunLine(list: 'runAllowances' | 'runDeductions', idx: number, field: 'name' | 'amount', value: string) {
    setOverrides((o) => {
      const items = [...(o[list] ?? [])];
      items[idx] = { ...items[idx], [field]: field === 'amount' ? Number(value) : value };
      return { ...o, [list]: items };
    });
  }

  function removeRunLine(list: 'runAllowances' | 'runDeductions', idx: number) {
    setOverrides((o) => ({
      ...o,
      [list]: (o[list] ?? []).filter((_, i) => i !== idx),
    }));
  }

  function exportCsv() {
    const headers = ['ID', 'Name', 'RSSB', 'Gross', 'PAYE', 'Net', 'Payable'];
    const lines = filteredRows.map((r) =>
      [r.employeeNumber, r.employeeName, r.rssbNumber ?? '', r.gross, r.paye, r.netSalary, r.finalPayable].join(',')
    );
    const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `payroll-register-${year}-${month}.csv`;
    a.click();
  }

  function resetFilters() {
    setDepartment('');
    setPosition('');
    setSearch('');
    setPage(1);
  }

  const totalRows = [
    { label: 'Gross Payroll', value: totals.gross },
    { label: 'Allowances', value: totals.allowances },
    { label: 'Deductions', value: totals.deductions },
    { label: 'PAYE', value: totals.paye },
    { label: 'RSSB Total', value: totals.rssbEmployee + totals.rssbEmployer + totals.occupationalHazardEmployer },
    { label: 'RAMA Total', value: totals.ramaEmployee + totals.ramaEmployer },
    { label: 'Mutuelle', value: totals.cbhi },
    { label: 'Net Payroll', value: totals.netSalary, emphasis: true },
  ];

  return (
    <div className="w-full min-w-0 space-y-5 pb-8 sm:space-y-6">
      {/* Page header */}
      <div className="rounded-[20px] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Monthly Processing</p>
            <h1 className="text-2xl font-semibold tracking-tight text-[#000435] sm:text-3xl">Payroll Processing</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Manage monthly payroll, taxes, allowances, deductions and employee salary processing.
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div className="relative w-full max-w-xs sm:w-56">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input !rounded-[14px] !py-2.5 pl-10"
                placeholder="Search employee…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <button
              type="button"
              onClick={() => setAdvancedOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-[14px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-[#000435] transition-colors hover:bg-slate-50"
            >
              <SlidersHorizontal size={15} /> Advanced
              {(department || position) && (
                <span className="h-1.5 w-1.5 rounded-full bg-[#FCB038]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={<Users size={20} />} label="Headcount" value={String(filteredRows.length)} hint="Employees in preview" />
        <KpiCard icon={<Wallet size={20} />} label="Gross Payroll" value={formatRwf(totals.gross)} />
        <KpiCard icon={<BarChart3 size={20} />} label="PAYE Tax" value={formatRwf(totals.paye)} />
        <KpiCard icon={<FileSpreadsheet size={20} />} label="Net Payroll" value={formatRwf(totals.netSalary)} />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={requestTrigger} disabled={triggering || !preview?.rows.length} className="btn-primary !rounded-[14px]">
          <Play size={16} /> {triggering ? 'Processing…' : 'Run Payroll'}
        </button>
        <button type="button" onClick={() => setStaffModalOpen(true)} className="btn-secondary !rounded-[14px]">
          <Users size={16} /> Select Employees ({staffIds.length || 'all'})
        </button>
        <button type="button" onClick={() => void loadPreview()} disabled={loading} className="btn-secondary !rounded-[14px]">
          <Eye size={16} /> Payroll Preview
        </button>
        <button type="button" onClick={exportCsv} disabled={!filteredRows.length} className="btn-secondary !rounded-[14px]">
          <Download size={16} /> Export Register
        </button>
        <Link href="/reports" className="btn-secondary !rounded-[14px]">
          <BarChart3 size={16} /> Reports
        </Link>
        <Link href="/settings" className="btn-secondary !rounded-[14px]">
          <Settings size={16} /> Payroll Settings
        </Link>
        <button type="button" onClick={() => void loadPreview()} disabled={loading} className="btn-secondary !rounded-[14px]">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Workflow timeline */}
      <div className="min-w-0 overflow-hidden rounded-[20px] border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Payroll Workflow</p>
        <div className="register-table-scroll -mx-1 px-1 pb-1">
          <div className="flex w-max min-w-full items-center gap-1 sm:flex-wrap sm:w-auto">
            {WORKFLOW_STEPS.map((step, i) => (
              <div key={step} className="flex shrink-0 items-center gap-1">
                <div
                  className={`rounded-full px-2.5 py-1.5 text-[10px] font-medium transition sm:px-3 sm:text-[11px] ${
                    i <= workflowStep ? 'bg-[#000435] text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {step}
                </div>
                {i < WORKFLOW_STEPS.length - 1 && <ChevronRight size={14} className="shrink-0 text-slate-300" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)] lg:gap-6">
        <div className="min-w-0 space-y-5 sm:space-y-6">
          {/* Period card */}
          <div className="rounded-[20px] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold text-[#000435] sm:text-lg">Payroll Period</h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">Choose the month and year to process payroll for.</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Month</label>
                <div className="relative">
                  <Calendar size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    className="input !rounded-[14px] pl-10"
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                  >
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Year</label>
                <div className="relative">
                  <CalendarDays size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    className="input !rounded-[14px] pl-10"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadPreview()}
              disabled={loading}
              className="btn-navy mt-4 w-full !rounded-[14px]"
            >
              {loading ? 'Loading…' : 'Load Payroll Preview'}
            </button>

            {validation.missingBasic > 0 && (
              <div className="mt-4 flex gap-3 rounded-[14px] border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-slate-400" />
                <div>
                  <p className="font-medium text-[#000435]">{validation.missingBasic} employees are missing Basic Salary.</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    <Link href="/staff-salary-setup" className="underline">Configure salary packages</Link> before running payroll.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Validation panel */}
        <div className="min-w-0 space-y-4">
          <div className="rounded-[20px] border border-slate-100 bg-white p-4 shadow-sm sm:p-5 lg:sticky lg:top-4">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Payroll Validation</p>
            <div className="space-y-1.5">
              {[
                { label: 'Missing Basic Salary', count: validation.missingBasic, href: '/staff-salary-setup', bad: validation.missingBasic > 0 },
                { label: 'Missing RSSB Number', count: validation.missingRssb, href: '/employees', bad: validation.missingRssb > 0 },
                { label: 'Missing Bank Account', count: validation.missingBank, href: '/employees', bad: validation.missingBank > 0 },
                { label: 'Missing Salary Template', count: 0, href: '/salary-template', bad: false },
                { label: 'Payroll Errors', count: validation.hasErrors ? 1 : 0, href: '/run', bad: validation.hasErrors },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center justify-between rounded-[14px] bg-slate-50 px-3 py-2.5 text-sm transition-colors hover:bg-slate-100"
                >
                  <span className="flex items-center gap-2 font-medium text-[#000435]">
                    {item.bad ? <AlertTriangle size={14} className="text-slate-400" /> : <CheckCircle2 size={14} className="text-slate-300" />}
                    {item.label}
                  </span>
                  <span className={`text-xs font-semibold ${item.bad ? 'text-[#000435]' : 'text-slate-400'}`}>{item.count}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Full-width register — spans entire content area below sidebar */}
      <PayrollRunRegisterTable
        rows={filteredRows}
        loading={loading}
        selected={selected}
        onSelectRow={(id) =>
          setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          })
        }
        onSelectAll={() =>
          setSelected((prev) =>
            prev.size === filteredRows.length ? new Set() : new Set(filteredRows.map((r) => r.staffId))
          )
        }
        allSelected={filteredRows.length > 0 && selected.size === filteredRows.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        onRowClick={setDrawerRow}
        onExportCsv={exportCsv}
      />

      {/* Run overrides — full width below register */}
      <div className="rounded-[20px] border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#000435]">
          <SlidersHorizontal size={18} className="text-slate-400" /> Run-level Overrides (this month only)
        </h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium text-slate-500">Extra Allowances</p>
            <div className="flex flex-wrap gap-2">
              {(overrides.runAllowances ?? []).map((item, i) => (
                <span key={i} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-[#000435]">
                  <input className="w-24 border-0 bg-transparent text-xs" value={item.name} onChange={(e) => updateRunLine('runAllowances', i, 'name', e.target.value)} />
                  <input type="number" className="w-20 border-0 bg-transparent text-xs" value={item.amount} onChange={(e) => updateRunLine('runAllowances', i, 'amount', e.target.value)} />
                  <button type="button" onClick={() => removeRunLine('runAllowances', i)} className="text-slate-400 hover:text-slate-600"><XCircle size={14} /></button>
                </span>
              ))}
              <button type="button" className="rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-slate-400 hover:text-[#000435]" onClick={() => addRunLine('runAllowances')}>
                + Add Allowance
              </button>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-slate-500">Extra Deductions</p>
            <div className="flex flex-wrap gap-2">
              {(overrides.runDeductions ?? []).map((item, i) => (
                <span key={i} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-[#000435]">
                  <input className="w-24 border-0 bg-transparent text-xs" value={item.name} onChange={(e) => updateRunLine('runDeductions', i, 'name', e.target.value)} />
                  <input type="number" className="w-20 border-0 bg-transparent text-xs" value={item.amount} onChange={(e) => updateRunLine('runDeductions', i, 'amount', e.target.value)} />
                  <button type="button" onClick={() => removeRunLine('runDeductions', i)} className="text-slate-400 hover:text-slate-600"><XCircle size={14} /></button>
                </span>
              ))}
              <button type="button" className="rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-slate-400 hover:text-[#000435]" onClick={() => addRunLine('runDeductions')}>
                + Add Deduction
              </button>
            </div>
          </div>
        </div>
      </div>

      <StaffToProcessModal
        open={staffModalOpen}
        selectedIds={staffIds}
        onClose={() => setStaffModalOpen(false)}
        onConfirm={(ids) => { setStaffIds(ids); void loadPreview(overrides, ids); }}
      />

      <PayrollRunEmployeeDrawer
        open={!!drawerRow}
        row={drawerRow}
        adjustment={drawerRow ? (overrides.employeeAdjustments?.[drawerRow.staffId] ?? {}) : {}}
        onClose={() => setDrawerRow(null)}
        onSave={saveEmployeeAdj}
      />

      <AdvancedPanel
        open={advancedOpen}
        onClose={() => setAdvancedOpen(false)}
        department={department}
        position={position}
        departments={departments}
        positions={positions}
        onDepartmentChange={(v) => { setDepartment(v); setPage(1); }}
        onPositionChange={(v) => { setPosition(v); setPage(1); }}
        onReset={resetFilters}
        totalRows={totalRows}
      />
    </div>
  );
}