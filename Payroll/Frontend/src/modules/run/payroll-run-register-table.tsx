'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  Eye,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { AvatarInitials } from '@/components/payroll-data-table';
import { formatRwf } from '@/config/payroll-nav';
import type { EnrichedRegisterRow } from './payroll-run-types';

type ColTone = 'default' | 'paye' | 'net' | 'employer' | 'employee' | 'muted' | 'gross';

interface ColDef {
  key: string;
  label: string;
  shortLabel?: string;
  group: string;
  align?: 'left' | 'right' | 'center';
  tone?: ColTone;
  numeric?: boolean;
  minW?: string;
  render: (row: EnrichedRegisterRow) => ReactNode;
}

const GROUPS = [
  { id: 'identity', label: 'Employee', color: 'bg-[#000435]' },
  { id: 'earnings', label: 'Earnings', color: 'bg-emerald-600' },
  { id: 'tax', label: 'Tax & CSR', color: 'bg-red-500' },
  { id: 'benefits', label: 'Maternity & RAMA', color: 'bg-[#FCB038]' },
  { id: 'net', label: 'Net & Bank', color: 'bg-violet-600' },
] as const;

const TONE: Record<ColTone, string> = {
  default: 'text-[#000435]',
  gross: 'text-[#000435] font-semibold',
  paye: 'text-red-600 font-semibold',
  net: 'text-emerald-600 font-bold',
  employer: 'text-blue-600 font-medium',
  employee: 'text-[#92650B] font-medium',
  muted: 'text-slate-500',
};

function fmt(n: number, tone: ColTone = 'default') {
  if (n == null || !Number.isFinite(n)) return <span className="text-slate-300">—</span>;
  return (
    <span className={`tabular-nums ${TONE[tone]}`}>
      {n.toLocaleString()}
    </span>
  );
}

function CellMoney({ value, tone = 'default' }: { value: number; tone?: ColTone }) {
  return <div className="text-right">{fmt(value, tone)}</div>;
}

const ALL_COLUMNS: ColDef[] = [
  {
    key: 'employee',
    label: 'Employee',
    group: 'identity',
    align: 'left',
    minW: '240px',
    render: (r) => (
      <div className="flex min-w-[200px] items-center gap-3">
        <AvatarInitials name={r.employeeName} seed={r.staffId} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#000435]" title={r.employeeName}>
            {r.employeeName}
          </p>
          <p className="truncate font-mono text-[11px] text-slate-400" title={r.employeeNumber}>
            {r.employeeNumber}
          </p>
        </div>
      </div>
    ),
  },
  { key: 'rssbNumber', label: 'RSSB No.', shortLabel: 'RSSB', group: 'identity', align: 'left', minW: '100px', render: (r) => <span className="text-xs text-slate-600">{r.rssbNumber || '—'}</span> },
  { key: 'firstName', label: 'First Name', group: 'identity', align: 'left', minW: '110px', render: (r) => <span className="text-sm text-[#000435]">{r.firstName}</span> },
  { key: 'lastName', label: 'Family Name', group: 'identity', align: 'left', minW: '110px', render: (r) => <span className="text-sm text-[#000435]">{r.lastName}</span> },
  { key: 'gender', label: 'Sex', group: 'identity', align: 'center', minW: '64px', render: (r) => <span className="text-xs font-medium uppercase text-slate-500">{r.gender?.[0] ?? '—'}</span> },
  { key: 'department', label: 'Department', group: 'identity', align: 'left', minW: '120px', render: (r) => <span className="text-xs text-slate-600">{r.department || '—'}</span> },
  { key: 'position', label: 'Position', group: 'identity', align: 'left', minW: '120px', render: (r) => <span className="text-xs text-slate-600">{r.position || '—'}</span> },
  { key: 'basicSalary', label: 'Basic Salary', shortLabel: 'Basic', group: 'earnings', align: 'right', numeric: true, minW: '108px', render: (r) => <CellMoney value={r.basicSalary} /> },
  {
    key: 'totalAllowances',
    label: 'Total Allowances',
    shortLabel: 'Allow.',
    group: 'earnings',
    align: 'right',
    numeric: true,
    minW: '108px',
    render: (r) => <CellMoney value={r.housing + r.transport + r.others + r.meal} tone="muted" />,
  },
  { key: 'others', label: 'Others', group: 'earnings', align: 'right', numeric: true, minW: '96px', render: (r) => <CellMoney value={r.others} /> },
  { key: 'housing', label: 'H/A', group: 'earnings', align: 'right', numeric: true, minW: '96px', render: (r) => <CellMoney value={r.housing} /> },
  { key: 'transport', label: 'T/A', group: 'earnings', align: 'right', numeric: true, minW: '96px', render: (r) => <CellMoney value={r.transport} /> },
  { key: 'meal', label: 'Meal', group: 'earnings', align: 'right', numeric: true, minW: '88px', render: (r) => <CellMoney value={r.meal} /> },
  { key: 'gross', label: 'Gross', group: 'earnings', align: 'right', numeric: true, minW: '112px', render: (r) => <CellMoney value={r.gross} tone="gross" /> },
  { key: 'base', label: 'Taxable Base', shortLabel: 'Base', group: 'tax', align: 'right', numeric: true, minW: '108px', render: (r) => <CellMoney value={r.base} tone="muted" /> },
  { key: 'paye', label: 'PAYE', group: 'tax', align: 'right', numeric: true, minW: '96px', render: (r) => <CellMoney value={r.paye} tone="paye" /> },
  { key: 'rssbEmployee', label: 'CSR 6% (Emp)', shortLabel: 'CSR Emp', group: 'tax', align: 'right', numeric: true, minW: '100px', render: (r) => <CellMoney value={r.rssbEmployee} tone="employee" /> },
  { key: 'rssbEmployer', label: 'CSR 6% (Er)', shortLabel: 'CSR Er', group: 'tax', align: 'right', numeric: true, minW: '100px', render: (r) => <CellMoney value={r.rssbEmployer} tone="employer" /> },
  { key: 'occupationalHazardEmployer', label: 'CSR 2%', group: 'tax', align: 'right', numeric: true, minW: '88px', render: (r) => <CellMoney value={r.occupationalHazardEmployer} tone="employer" /> },
  {
    key: 'totalCsr',
    label: 'Total CSR 14%',
    shortLabel: 'Tot CSR',
    group: 'tax',
    align: 'right',
    numeric: true,
    minW: '108px',
    render: (r) => <CellMoney value={r.rssbEmployee + r.rssbEmployer + r.occupationalHazardEmployer} tone="employer" />,
  },
  { key: 'maternityEmployee', label: 'M.Leave Emp', group: 'benefits', align: 'right', numeric: true, minW: '100px', render: (r) => <CellMoney value={r.maternityEmployee} tone="employee" /> },
  { key: 'maternityEmployer', label: 'M.Leave Er', group: 'benefits', align: 'right', numeric: true, minW: '100px', render: (r) => <CellMoney value={r.maternityEmployer} tone="employer" /> },
  {
    key: 'totalMaternity',
    label: 'Tot MLD',
    group: 'benefits',
    align: 'right',
    numeric: true,
    minW: '96px',
    render: (r) => <CellMoney value={r.maternityEmployee + r.maternityEmployer} tone="muted" />,
  },
  { key: 'ramaEmployee', label: 'RAMA Emp', group: 'benefits', align: 'right', numeric: true, minW: '100px', render: (r) => <CellMoney value={r.ramaEmployee} tone="employee" /> },
  { key: 'ramaEmployer', label: 'RAMA Er', group: 'benefits', align: 'right', numeric: true, minW: '100px', render: (r) => <CellMoney value={r.ramaEmployer} tone="employer" /> },
  {
    key: 'totalRama',
    label: 'Total RAMA',
    group: 'benefits',
    align: 'right',
    numeric: true,
    minW: '108px',
    render: (r) => <CellMoney value={r.ramaEmployee + r.ramaEmployer} tone="employee" />,
  },
  { key: 'cbhi', label: 'Mutuelle', group: 'net', align: 'right', numeric: true, minW: '96px', render: (r) => <CellMoney value={r.cbhi} tone="muted" /> },
  { key: 'employeeDeductionTotal', label: 'Other Ded.', group: 'net', align: 'right', numeric: true, minW: '100px', render: (r) => <CellMoney value={r.employeeDeductionTotal} tone="paye" /> },
  { key: 'netSalary', label: 'Net Salary', group: 'net', align: 'right', numeric: true, minW: '112px', render: (r) => <CellMoney value={r.netSalary} tone="net" /> },
  { key: 'finalPayable', label: 'Net Payable', group: 'net', align: 'right', numeric: true, minW: '112px', render: (r) => <CellMoney value={r.finalPayable} tone="net" /> },
  { key: 'bankName', label: 'Bank', group: 'net', align: 'left', minW: '100px', render: (r) => <span className="text-xs text-slate-600">{r.bankName || '—'}</span> },
  { key: 'bankAccount', label: 'Account', group: 'net', align: 'left', minW: '120px', render: (r) => <span className="font-mono text-[11px] text-slate-500">{r.bankAccount || '—'}</span> },
];

const DEFAULT_VISIBLE = new Set([
  'employee',
  'gender',
  'department',
  'basicSalary',
  'others',
  'housing',
  'transport',
  'gross',
  'paye',
  'rssbEmployee',
  'maternityEmployee',
  'ramaEmployee',
  'cbhi',
  'netSalary',
  'finalPayable',
]);

function pageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

function sumCol(rows: EnrichedRegisterRow[], key: string): number {
  if (key === 'totalAllowances') {
    return rows.reduce((s, r) => s + r.housing + r.transport + r.others + r.meal, 0);
  }
  if (key === 'totalCsr') {
    return rows.reduce((s, r) => s + r.rssbEmployee + r.rssbEmployer + r.occupationalHazardEmployer, 0);
  }
  if (key === 'totalMaternity') {
    return rows.reduce((s, r) => s + r.maternityEmployee + r.maternityEmployer, 0);
  }
  if (key === 'totalRama') {
    return rows.reduce((s, r) => s + r.ramaEmployee + r.ramaEmployer, 0);
  }
  const col = ALL_COLUMNS.find((c) => c.key === key);
  if (!col?.numeric) return 0;
  return rows.reduce((s, r) => s + (Number((r as Record<string, number>)[key]) || 0), 0);
}

function PaginationBar({
  from,
  to,
  total,
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  from: number;
  to: number;
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/40 px-4 py-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
      <p className="text-center text-xs text-slate-500 sm:text-left">
        Showing <span className="font-semibold text-[#000435]">{from}</span>–<span className="font-semibold text-[#000435]">{to}</span> of{' '}
        <span className="font-semibold text-[#000435]">{total.toLocaleString()}</span> employees
      </p>
      <div className="flex items-center justify-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-slate-200 bg-white p-1.5 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
        >
          <ChevronLeft size={16} />
        </button>
        {pageNumbers(page, totalPages).map((p, i) =>
          p === '...' ? (
            <span key={`e-${i}`} className="px-1 text-slate-400">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`min-w-[32px] rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                p === page ? 'bg-[#FCB038] text-[#000435] shadow-sm' : 'text-slate-500 hover:bg-white'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-slate-200 bg-white p-1.5 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#000435] outline-none transition-colors focus:border-[#FCB038] focus:ring-2 focus:ring-[#FCB038]/20 sm:w-auto"
      >
        {[10, 20, 50, 100].map((n) => (
          <option key={n} value={n}>{n} rows / page</option>
        ))}
      </select>
    </div>
  );
}

function MobileRegisterCard({
  row,
  selected,
  onSelect,
  onOpen,
}: {
  row: EnrichedRegisterRow;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}) {
  return (
    <div
      className={`rounded-[18px] border bg-white p-4 shadow-sm transition-shadow ${
        selected ? 'border-[#FCB038] ring-2 ring-[#FCB038]/20' : 'border-slate-100 hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-[#FCB038] focus:ring-[#FCB038]/30"
        />
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-3">
            <AvatarInitials name={row.employeeName} seed={row.staffId} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[#000435]">{row.employeeName}</p>
              <p className="font-mono text-[10px] text-slate-400">{row.employeeNumber}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">{row.department || '—'} · {row.position || '—'}</p>
            </div>
            <ChevronRight size={16} className="shrink-0 text-slate-300" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Basic', row.basicSalary, 'text-[#000435]'],
              ['Gross', row.gross, 'text-[#000435]'],
              ['PAYE', row.paye, 'text-red-600'],
              ['Net', row.netSalary, 'text-emerald-600'],
            ].map(([label, val, cls]) => (
              <div key={String(label)} className="rounded-xl bg-slate-50 px-2.5 py-2">
                <p className="text-[9px] font-bold uppercase text-slate-400">{label}</p>
                <p className={`text-xs font-bold tabular-nums ${cls}`}>
                  {Number(val) > 0 ? formatRwf(Number(val)).replace(' RWF', '') : '—'}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
            <div><span className="text-slate-400">O</span> <span className="font-semibold tabular-nums text-[#000435]">{row.others.toLocaleString()}</span></div>
            <div><span className="text-slate-400">H/A</span> <span className="font-semibold tabular-nums text-[#000435]">{row.housing.toLocaleString()}</span></div>
            <div><span className="text-slate-400">T/A</span> <span className="font-semibold tabular-nums text-[#000435]">{row.transport.toLocaleString()}</span></div>
          </div>
        </button>
      </div>
    </div>
  );
}

interface Props {
  rows: EnrichedRegisterRow[];
  loading?: boolean;
  selected: Set<string>;
  onSelectRow: (id: string) => void;
  onSelectAll: () => void;
  allSelected: boolean;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onRowClick?: (row: EnrichedRegisterRow) => void;
  onExportCsv?: () => void;
}

export function PayrollRunRegisterTable({
  rows,
  loading,
  selected,
  onSelectRow,
  onSelectAll,
  allSelected,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  onExportCsv,
}: Props) {
  const [visibleCols, setVisibleCols] = useState<Set<string>>(DEFAULT_VISIBLE);
  const [showColSettings, setShowColSettings] = useState(false);

  const columns = useMemo(() => ALL_COLUMNS.filter((c) => visibleCols.has(c.key)), [visibleCols]);

  const isDefaultColumns = useMemo(
    () => visibleCols.size === DEFAULT_VISIBLE.size && [...visibleCols].every((k) => DEFAULT_VISIBLE.has(k)),
    [visibleCols]
  );

  const groupSpans = useMemo(() => {
    const spans: { group: (typeof GROUPS)[number]; count: number }[] = [];
    for (const g of GROUPS) {
      const count = columns.filter((c) => c.group === g.id).length;
      if (count > 0) spans.push({ group: g, count });
    }
    return spans;
  }, [columns]);

  const tableMinWidth = useMemo(
    () => columns.reduce((sum, c) => sum + parseInt(c.minW ?? '96', 10), 48),
    [columns]
  );

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const from = rows.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, rows.length);

  function toggleCol(key: string) {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 3) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function toggleGroup(groupId: string, on: boolean) {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      ALL_COLUMNS.filter((c) => c.group === groupId).forEach((c) => {
        if (on) next.add(c.key);
        else if (c.key !== 'employee') next.delete(c.key);
      });
      return next;
    });
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden rounded-[20px] border border-slate-200/80 bg-white shadow-[0_4px_24px_-4px_rgba(0,4,53,0.08)]">
      {/* Scoped, brand-colored scrollbar for the desktop table only */}
      <style>{`
        .register-table-scroll::-webkit-scrollbar {
          height: 10px;
        }
        .register-table-scroll::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .register-table-scroll::-webkit-scrollbar-thumb {
          background-color: #000435;
          border-radius: 9999px;
          border: 2px solid #f8fafc;
        }
        .register-table-scroll::-webkit-scrollbar-thumb:hover {
          background-color: #FCB038;
        }
        .register-table-scroll {
          scrollbar-width: thin;
          scrollbar-color: #000435 #f8fafc;
        }
      `}</style>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-white via-white to-slate-50/50 px-4 py-3 sm:px-5 sm:py-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#000435] text-white">
              <SlidersHorizontal size={15} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-[#000435]">Payroll Register</h2>
              <p className="text-[11px] text-slate-500">
                {rows.length} employees · {columns.length} columns visible
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowColSettings((v) => !v)}
            className={`hidden items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-150 motion-safe:hover:-translate-y-0.5 lg:inline-flex ${
              showColSettings ? 'border-[#000435] bg-[#000435] text-white' : 'border-slate-200 bg-white text-[#000435] hover:bg-slate-50'
            }`}
          >
            <Columns3 size={14} />
            Columns
          </button>
          {onExportCsv && (
            <button
              type="button"
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#000435] transition-all duration-150 hover:bg-slate-50 motion-safe:hover:-translate-y-0.5"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}
        </div>
      </div>

      {/* Column picker */}
      {showColSettings && (
        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Column visibility</p>
            <div className="flex items-center gap-3">
              {!isDefaultColumns && (
                <button
                  type="button"
                  onClick={() => setVisibleCols(new Set(DEFAULT_VISIBLE))}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FCB038] hover:text-[#000435]"
                >
                  <RotateCcw size={11} /> Reset to default
                </button>
              )}
              <button type="button" onClick={() => setShowColSettings(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {GROUPS.map((g) => {
              const groupCols = ALL_COLUMNS.filter((c) => c.group === g.id);
              const allOn = groupCols.every((c) => visibleCols.has(c.key));
              return (
                <div key={g.id} className="rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-slate-300">
                  <button
                    type="button"
                    onClick={() => toggleGroup(g.id, !allOn)}
                    className="mb-2 flex w-full items-center gap-2 text-left"
                  >
                    <span className={`h-2 w-2 rounded-full ${g.color}`} />
                    <span className="text-xs font-bold text-[#000435]">{g.label}</span>
                    <span className="ml-auto text-[10px] text-slate-400">{allOn ? 'All' : 'Partial'}</span>
                  </button>
                  <div className="space-y-1">
                    {groupCols.map((c) => (
                      <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-0.5 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={visibleCols.has(c.key)}
                          disabled={c.key === 'employee'}
                          onChange={() => toggleCol(c.key)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-[#FCB038] focus:ring-[#FCB038]/30"
                        />
                        <span className="text-[11px] text-slate-600">{c.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile card list */}
      <div className="space-y-3 p-4 lg:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-[18px] bg-slate-100" />
          ))
        ) : pageRows.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-slate-200 py-16 text-center">
            <p className="font-semibold text-[#000435]">No payroll data</p>
            <p className="mt-1 text-sm text-slate-500">Load a preview to see employees.</p>
          </div>
        ) : (
          pageRows.map((row) => (
            <MobileRegisterCard
              key={row.staffId}
              row={row}
              selected={selected.has(row.staffId)}
              onSelect={() => onSelectRow(row.staffId)}
              onOpen={() => onRowClick?.(row)}
            />
          ))
        )}
      </div>

      {/* Desktop table — horizontal scroll inside card only */}
      <div className="hidden min-w-0 lg:block">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2">
          <p className="text-[10px] font-medium text-slate-500">
            Scroll horizontally inside the table for more columns →
          </p>
        </div>
        <div className="register-table-scroll min-w-0 w-full overflow-x-auto pb-2">
          <table
            className="w-full min-w-full border-separate border-spacing-0 text-sm"
            style={{ minWidth: `${tableMinWidth + 48}px` }}
          >
            <colgroup>
              <col className="w-12" />
              {columns.map((col) => (
                <col key={col.key} style={{ minWidth: col.minW }} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-[#000435] text-white">
                <th rowSpan={2} className="sticky left-0 z-40 w-12 min-w-[48px] bg-[#000435] px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onSelectAll}
                    className="h-4 w-4 rounded border-white/30 bg-white/10 text-[#FCB038]"
                  />
                </th>
                {groupSpans.map(({ group, count }) => (
                  <th
                    key={group.id}
                    colSpan={count}
                    className="whitespace-nowrap border-b border-white/10 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${group.color}`} />
                      {group.label}
                    </span>
                  </th>
                ))}
              </tr>
              <tr className="bg-slate-100">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    style={{ minWidth: col.minW }}
                    className={`whitespace-nowrap border-b border-slate-200 bg-slate-100 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    }`}
                  >
                    {col.shortLabel ?? col.label}
                  </th>
                ))}
              </tr>
            </thead>

          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className={i % 2 ? 'bg-slate-50/60' : 'bg-white'}>
                  <td className="sticky left-0 z-20 bg-inherit px-3 py-3">
                    <div className="h-4 w-4 animate-pulse rounded bg-slate-200" />
                  </td>
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 py-3" style={{ minWidth: col.minW }}>
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-6 py-20 text-center">
                  <p className="font-semibold text-[#000435]">No payroll register data</p>
                  <p className="mt-1 text-sm text-slate-500">Load a payroll preview first.</p>
                </td>
              </tr>
            ) : (
              pageRows.map((row, idx) => {
                const isSelected = selected.has(row.staffId);
                const rowBg = idx % 2 ? 'bg-slate-50/70' : 'bg-white';
                return (
                  <tr
                    key={row.staffId}
                    onClick={() => onRowClick?.(row)}
                    className={`group cursor-pointer transition-colors ${rowBg} ${
                      isSelected ? '!bg-[#FCB038]/10' : 'hover:bg-[#FCB038]/5'
                    }`}
                  >
                    <td
                      className={`sticky left-0 z-20 border-r border-slate-100 px-3 py-3 ${rowBg} group-hover:bg-[#FCB038]/5`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelectRow(row.staffId)}
                        className="h-4 w-4 rounded border-slate-300 text-[#FCB038]"
                      />
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        style={{ minWidth: col.minW }}
                        className={`whitespace-nowrap px-3 py-3 ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        }`}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>

          {!loading && pageRows.length > 0 && (
            <tfoot>
              <tr className="bg-[#000435] text-white">
                <td className="sticky left-0 z-30 border-r border-white/10 px-3 py-3 text-[10px] font-bold uppercase">
                  Totals
                </td>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{ minWidth: col.minW }}
                    className="whitespace-nowrap px-3 py-3 text-right text-xs font-bold tabular-nums"
                  >
                    {col.key === 'employee' ? (
                      <span className="text-left text-[10px] text-white/60">Page subtotal</span>
                    ) : col.numeric ? (
                      <span
                        className={
                          col.tone === 'paye'
                            ? 'text-red-300'
                            : col.key === 'netSalary' || col.key === 'finalPayable'
                              ? 'text-emerald-300'
                              : 'text-white'
                        }
                      >
                        {sumCol(pageRows, col.key).toLocaleString()}
                      </span>
                    ) : null}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
          </table>
        </div>
      </div>

      {rows.length > 0 && (
        <PaginationBar
          from={from}
          to={to}
          total={rows.length}
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}

      {/* Legend — desktop only, pill style */}
      <div className="hidden flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3 lg:flex sm:px-5">
        {[
          { color: 'bg-emerald-500', label: 'Net pay' },
          { color: 'bg-red-500', label: 'PAYE / deductions' },
          { color: 'bg-blue-500', label: 'Employer contrib.' },
          { color: 'bg-[#FCB038]', label: 'Employee contrib.' },
        ].map((item) => (
          <span
            key={item.label}
            className="flex items-center gap-1.5 rounded-full border border-slate-100 bg-slate-50/80 px-2.5 py-1 text-[10px] font-medium text-slate-500"
          >
            <span className={`h-2 w-2 rounded-full ${item.color}`} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export { ALL_COLUMNS };