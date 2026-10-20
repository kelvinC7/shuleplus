'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Banknote,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { MONTHS, formatRwf, statusColor } from '@/config/payroll-nav';
import { payrollApi, type PayrollStaff } from '@/services/payroll-api';
import { useToast, useConfirm } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { PayrollRunRegisterTable } from '@/modules/run/payroll-run-register-table';
import {
  enrichRegisterRows,
  registerTotals,
  type RegisterRow,
} from '@/modules/run/payroll-run-types';

type RunStatus = 'ALL' | 'PROCESSING' | 'PAID';

interface PayrollRunItem {
  id: string;
  runNumber: string;
  month: number;
  year: number;
  status: string;
  totalsJson?: Record<string, number>;
  paymentRef?: string | null;
  paymentDate?: string | null;
}

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

function yearOptions(anchor: number, selected: number) {
  const years = new Set(Array.from({ length: 5 }, (_, i) => anchor - 2 + i));
  years.add(selected);
  return [...years].sort((a, b) => a - b);
}

function shiftCalendarMonth(month: number, year: number, delta: number) {
  const d = new Date(year, month - 1 + delta, 1);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

export function SalaryPaymentView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { confirm } = useConfirm();
  const now = new Date();

  const [month, setMonth] = useState<number | ''>(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [statusFilter, setStatusFilter] = useState<RunStatus>('ALL');
  const [runs, setRuns] = useState<PayrollRunItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [registerRows, setRegisterRows] = useState<RegisterRow[]>([]);
  const [staffList, setStaffList] = useState<PayrollStaff[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [paying, setPaying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const selectedRun = useMemo(() => runs.find((r) => r.id === selectedId) ?? null, [runs, selectedId]);
  const isProcessing = selectedRun?.status === 'PROCESSING';
  const isPaid = selectedRun?.status === 'PAID';
  const periodLabel = selectedRun ? `${MONTHS[selectedRun.month - 1]} ${selectedRun.year}` : '—';

  const staffMap = useMemo(() => new Map(staffList.map((s) => [s.id, s])), [staffList]);

  const enrichedRows = useMemo(
    () => enrichRegisterRows(registerRows, staffMap),
    [registerRows, staffMap]
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

  const loadRuns = useCallback(async () => {
    setLoadingRuns(true);
    try {
      const params: Record<string, string | number> = { year };
      if (month !== '') params.month = month;
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const { data } = await payrollApi.listRuns(params);
      const list = (data.data ?? []) as PayrollRunItem[];
      setRuns(list);

      const fromQuery = searchParams.get('run');
      setSelectedId((current) => {
        if (fromQuery && list.some((r) => r.id === fromQuery)) return fromQuery;
        if (current && list.some((r) => r.id === current)) return current;
        return list[0]?.id ?? null;
      });
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to load payroll runs'), 'Load failed');
      setRuns([]);
      setSelectedId(null);
      setRegisterRows([]);
    } finally {
      setLoadingRuns(false);
    }
  }, [month, year, statusFilter, searchParams, toast]);

  const loadRegister = useCallback(async (runId: string) => {
    setLoadingRegister(true);
    try {
      const { data } = await payrollApi.getRun(runId);
      setRegisterRows((data.data.registerJson as RegisterRow[]) ?? []);
      setPaymentRef(String(data.data.paymentRef ?? ''));
      setPage(1);
      setSelected(new Set());
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to load register'), 'Load failed');
      setRegisterRows([]);
    } finally {
      setLoadingRegister(false);
    }
  }, [toast]);

  useEffect(() => {
    payrollApi.listStaff().then((res) => setStaffList(res.data.data as PayrollStaff[]));
  }, []);

  useEffect(() => {
    void loadRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year, statusFilter]);

  useEffect(() => {
    if (selectedId) void loadRegister(selectedId);
    else setRegisterRows([]);
  }, [selectedId, loadRegister]);

  async function executeMarkPaid() {
    if (!selectedId || !isProcessing || !selectedRun) return;

    setPaying(true);
    try {
      await payrollApi.markPaid(selectedId, { paymentRef: paymentRef.trim() || undefined });
      toast.success(`Payroll ${selectedRun.runNumber} marked as paid for ${periodLabel}.`, 'Payment recorded');
      await loadRuns();
      if (selectedId) await loadRegister(selectedId);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Payment failed'), 'Payment failed');
    } finally {
      setPaying(false);
    }
  }

  async function executeDeleteRun() {
    if (!selectedId || !isProcessing || !selectedRun) return;

    setDeleting(true);
    try {
      await payrollApi.deleteRun(selectedId);
      toast.success(`Payroll run ${selectedRun.runNumber} was removed.`, 'Run deleted');
      setSelectedId(null);
      setRegisterRows([]);
      router.replace('/salary-payment');
      await loadRuns();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Delete failed'), 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  async function requestMarkPaid() {
    if (!selectedId || !isProcessing || !selectedRun) return;
    const ok = await confirm({
      title: 'Mark payroll as paid?',
      description: `Confirm payment for ${selectedRun.runNumber} (${periodLabel}).`,
      confirmLabel: 'Mark as Paid',
    });
    if (ok) await executeMarkPaid();
  }

  async function requestDeleteRun() {
    if (!selectedId || !isProcessing || !selectedRun) return;
    const ok = await confirm({
      title: 'Delete payroll run?',
      description: `${selectedRun.runNumber} will be permanently removed from the database.`,
      confirmLabel: 'Delete run',
      cancelLabel: 'Keep run',
      tone: 'danger',
    });
    if (ok) await executeDeleteRun();
  }

  function exportCsv() {
    const headers = ['ID', 'Name', 'RSSB', 'Gross', 'PAYE', 'Net', 'Payable'];
    const lines = filteredRows.map((r) =>
      [r.employeeNumber, r.employeeName, r.rssbNumber ?? '', r.gross, r.paye, r.netSalary, r.finalPayable].join(',')
    );
    const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `salary-payment-${selectedRun?.runNumber ?? 'register'}.csv`;
    a.click();
  }

  function resetFilters() {
    setDepartment('');
    setPosition('');
    setSearch('');
    setPage(1);
  }

  const workflowStep = isPaid ? 2 : isProcessing ? 1 : 0;

  return (
    <div className="w-full min-w-0 space-y-5 pb-8 sm:space-y-6">
      {/* Header */}
      <div className="rounded-[20px] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Disbursement</p>
            <h1 className="text-2xl font-semibold tracking-tight text-[#000435] sm:text-3xl">Salary Payment</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Review payroll registers, mark runs as paid, or remove processing runs before payment.
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
              {(department || position) && <span className="h-1.5 w-1.5 rounded-full bg-[#FCB038]" />}
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={<Users size={20} />} label="Headcount" value={String(filteredRows.length)} hint={selectedRun ? selectedRun.runNumber : 'No run selected'} />
        <KpiCard icon={<Wallet size={20} />} label="Gross Payroll" value={formatRwf(totals.gross)} />
        <KpiCard icon={<Banknote size={20} />} label="Net Payable" value={formatRwf(totals.finalPayable)} />
        <KpiCard
          icon={<FileSpreadsheet size={20} />}
          label="Run Status"
          value={selectedRun?.status ?? '—'}
          hint={isPaid && selectedRun?.paymentDate ? `Paid ${new Date(selectedRun.paymentDate).toLocaleDateString()}` : undefined}
        />
      </div>

      {/* Workflow */}
      <div className="rounded-[20px] border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Payment Workflow</p>
        <div className="flex flex-wrap items-center gap-2">
          {['Select Run', 'Processing', 'Paid'].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-1.5 text-[10px] font-semibold sm:text-[11px] ${
                  i <= workflowStep ? 'bg-[#000435] text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {step}
              </span>
              {i < 2 && <ChevronRight size={14} className="text-slate-300" />}
            </div>
          ))}
        </div>
      </div>

      {/* Period + run filters */}
      <div className="rounded-[20px] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#000435]/5 text-[#000435]">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#000435] sm:text-lg">Payroll Runs</h2>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Filter by calendar month, year, and payment status.</p>
            </div>
          </div>
          {selectedRun && (
            <span className={`badge ${statusColor(selectedRun.status)}`}>{selectedRun.status}</span>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const m = month === '' ? now.getMonth() + 1 : Number(month);
                const next = shiftCalendarMonth(m, year, -1);
                setMonth(next.month);
                setYear(next.year);
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-[#000435]"
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>

            <select
              className="input !w-auto !min-w-[108px] !rounded-[14px] !py-2.5"
              value={month}
              onChange={(e) => setMonth(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">All months</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>

            <select
              className="input !w-auto !min-w-[96px] !rounded-[14px] !py-2.5"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {yearOptions(now.getFullYear(), year).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <select
              className="input !w-auto !min-w-[130px] !rounded-[14px] !py-2.5"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RunStatus)}
            >
              <option value="ALL">All statuses</option>
              <option value="PROCESSING">Processing</option>
              <option value="PAID">Paid</option>
            </select>

            <button
              type="button"
              onClick={() => {
                const m = month === '' ? now.getMonth() + 1 : Number(month);
                const next = shiftCalendarMonth(m, year, 1);
                setMonth(next.month);
                setYear(next.year);
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-[#000435]"
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>

            <button type="button" onClick={() => void loadRuns()} disabled={loadingRuns} className="btn-secondary !rounded-[14px] !py-2.5">
              <RefreshCw size={16} className={loadingRuns ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto] lg:items-end">
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Payroll run</label>
            <select
              className="input !rounded-[14px]"
              value={selectedId ?? ''}
              onChange={(e) => {
                setSelectedId(e.target.value || null);
                router.replace(e.target.value ? `/salary-payment?run=${e.target.value}` : '/salary-payment');
              }}
              disabled={!runs.length}
            >
              {!runs.length ? (
                <option value="">No runs for selected filters</option>
              ) : (
                runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.runNumber} — {MONTHS[r.month - 1]} {r.year} ({r.status})
                  </option>
                ))
              )}
            </select>
          </div>

          {isProcessing && (
            <>
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Payment reference</label>
                <input
                  className="input !rounded-[14px]"
                  placeholder="Bank ref / transaction ID"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                />
              </div>
              <button type="button" onClick={requestMarkPaid} disabled={paying} className="btn-primary !rounded-[14px]">
                <CheckCircle2 size={16} /> {paying ? 'Paying…' : 'Mark as Paid'}
              </button>
              <button type="button" onClick={requestDeleteRun} disabled={deleting} className="btn-secondary !rounded-[14px] !text-red-600">
                <Trash2 size={16} /> {deleting ? 'Deleting…' : 'Delete Run'}
              </button>
            </>
          )}

          {isPaid && (
            <div className="rounded-[14px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 lg:col-span-3">
              <p className="font-semibold">This payroll is paid and locked.</p>
              <p className="mt-0.5 text-xs">
                {selectedRun?.paymentRef ? `Reference: ${selectedRun.paymentRef}` : 'No payment reference recorded'}
                {selectedRun?.paymentDate ? ` · ${new Date(selectedRun.paymentDate).toLocaleString()}` : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Register filters */}
      <div className="rounded-[20px] border border-slate-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select className="input !rounded-[14px] !py-2.5" value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); }}>
            <option value="">All departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="input !rounded-[14px] !py-2.5" value={position} onChange={(e) => { setPosition(e.target.value); setPage(1); }}>
            <option value="">All positions</option>
            {positions.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <button type="button" className="btn-secondary !rounded-[14px]" onClick={resetFilters}>
            Reset Filters
          </button>
          <button type="button" className="btn-secondary !rounded-[14px]" onClick={exportCsv} disabled={!filteredRows.length}>
            <Download size={14} /> Export Register
          </button>
        </div>
      </div>

      {!selectedRun && !loadingRuns && (
        <div className="rounded-[20px] border border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="font-semibold text-[#000435]">No payroll run selected</p>
          <p className="mt-1 text-sm text-slate-500">
            Run payroll from{' '}
            <Link href="/run" className="text-[#FCB038] underline">Payroll Run</Link> first, then return here to pay.
          </p>
        </div>
      )}

      {selectedRun && (
        <PayrollRunRegisterTable
          rows={filteredRows}
          loading={loadingRegister}
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
          onExportCsv={exportCsv}
        />
      )}

      {/* Advanced panel */}
      {advancedOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-[#000435]/15 backdrop-blur-[1px]" onClick={() => setAdvancedOpen(false)} />
          <div className="relative flex h-full w-full max-w-sm flex-col bg-white shadow-[-8px_0_32px_-8px_rgba(0,4,53,0.2)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-[#000435]">Advanced Filters</h2>
              <button type="button" onClick={() => setAdvancedOpen(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              <div className="space-y-2.5">
                <select className="input" value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); }}>
                  <option value="">All departments</option>
                  {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <select className="input" value={position} onChange={(e) => { setPosition(e.target.value); setPage(1); }}>
                  <option value="">All positions</option>
                  {positions.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <button type="button" onClick={resetFilters} className="btn-secondary w-full">
                  Reset filters
                </button>
              </div>
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Register totals</p>
                <div className="divide-y divide-slate-100">
                  {[
                    { label: 'Gross', value: totals.gross },
                    { label: 'PAYE', value: totals.paye },
                    { label: 'Net Payable', value: totals.finalPayable, emphasis: true },
                  ].map((row) => (
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
      )}
    </div>
  );
}
