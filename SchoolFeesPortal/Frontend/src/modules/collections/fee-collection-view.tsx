'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  ChevronDown,
  Download,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/shared/notifications';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { FeesDataTable, type FeesTableColumn } from '@/components/fees-data-table';
import { FeesPageTitle } from '@/components/fees-page-title';
import { CollectionStatusBadge } from '@/modules/collections/risk-badge';
import { StudentFinancialDrawer } from '@/modules/collections/student-financial-drawer';
import { CollectPaymentModal } from '@/modules/collections/collect-payment-modal';
import { SendReminderModal } from '@/modules/collections/send-reminder-modal';

type CollectionRow = {
  id: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  className: string | null;
  academicYear: string;
  term: string;
  totalFees: number;
  paid: number;
  remaining: number;
  lastPaymentAt: string | null;
  lastPaymentMethod: string | null;
  displayStatus: string;
  billId: string | null;
};

type Summary = {
  totalExpected: number;
  totalPaid: number;
  remaining: number;
  studentsPaid: number;
  studentsPartial: number;
  studentsNotPaid: number;
  studentsWithBalance: number;
};

type AcademicContext = {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
  classes: { id: string; name: string; label: string }[];
};

const PAYMENT_METHODS = [
  { value: 'all', label: 'All methods' },
  { value: 'CASH', label: 'Cash' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'POS', label: 'Card / POS' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
  { value: 'NOT_PAID', label: 'Not Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
];

function fmtMoney(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M RWF`;
  return `${n.toLocaleString()} RWF`;
}

export function FeeCollectionView() {
  const toast = useToast();
  const [ctx, setCtx] = useState<AcademicContext | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<CollectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    academicYear: 'all',
    term: 'all',
    className: 'all',
    paymentStatus: 'all',
    method: 'all',
    dateFrom: '',
    dateTo: '',
    search: '',
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);
  const [menuRowId, setMenuRowId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<CollectionRow | null>(null);
  const [collectOpen, setCollectOpen] = useState(false);
  const [collectPrefill, setCollectPrefill] = useState<CollectionRow | null>(null);
  const [reminderOpen, setReminderOpen] = useState(false);

  useEffect(() => {
    void api.get('/structures/academic-context').then(({ data }) => {
      const c = data.data as AcademicContext;
      setCtx(c);
      setFilters((f) => ({
        ...f,
        academicYear: f.academicYear === 'all' ? c.currentAcademicYear ?? 'all' : f.academicYear,
        term: f.term === 'all' ? c.currentTerm ?? 'all' : f.term,
      }));
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.academicYear !== 'all') params.academicYear = filters.academicYear;
      if (filters.term !== 'all') params.term = filters.term;
      if (filters.className !== 'all') params.className = filters.className;
      if (filters.paymentStatus !== 'all') params.paymentStatus = filters.paymentStatus;
      if (filters.method !== 'all') params.method = filters.method;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      if (filters.search.trim()) params.search = filters.search.trim();
      const { data } = await api.get('/collections/fee-collection', { params });
      setSummary(data.data?.summary ?? null);
      setRows(data.data?.rows ?? []);
      setPage(1);
    } catch {
      toast.error('Could not load fee collection data');
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const paged = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [rows, page, pageSize]
  );

  const allSelected = paged.length > 0 && paged.every((r) => selected.has(r.id));

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        paged.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        paged.forEach((r) => next.add(r.id));
        return next;
      });
    }
  }

  async function exportCsv() {
    try {
      const params: Record<string, string> = {};
      if (filters.academicYear !== 'all') params.academicYear = filters.academicYear;
      if (filters.term !== 'all') params.term = filters.term;
      if (filters.className !== 'all') params.className = filters.className;
      if (filters.paymentStatus !== 'all') params.paymentStatus = filters.paymentStatus;
      if (filters.method !== 'all') params.method = filters.method;
      if (filters.search.trim()) params.search = filters.search.trim();
      const { data } = await api.get('/collections/fee-collection/export', {
        params,
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `fee-collection-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setExportOpen(false);
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed');
    }
  }

  const columns: FeesTableColumn<CollectionRow>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (r) => (
        <div>
          <p className="font-semibold text-navy">{r.studentName}</p>
          <p className="text-xs text-muted">{r.studentCode}</p>
        </div>
      ),
    },
    { key: 'class', header: 'Class', render: (r) => r.className ?? '—' },
    {
      key: 'expected',
      header: 'Total Fees',
      render: (r) => <span className="tabular-nums">{r.totalFees.toLocaleString()} RWF</span>,
    },
    {
      key: 'paid',
      header: 'Paid',
      render: (r) => <span className="text-emerald-700 tabular-nums">{r.paid.toLocaleString()} RWF</span>,
    },
    {
      key: 'remaining',
      header: 'Remaining',
      render: (r) => (
        <span className={`font-bold tabular-nums ${r.remaining > 0 ? 'text-navy' : 'text-emerald-700'}`}>
          {r.remaining.toLocaleString()} RWF
        </span>
      ),
    },
    {
      key: 'last',
      header: 'Last Payment',
      render: (r) =>
        r.lastPaymentAt
          ? new Date(r.lastPaymentAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          : '—',
    },
    { key: 'status', header: 'Status', render: (r) => <CollectionStatusBadge status={r.displayStatus} /> },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="relative">
          <button
            type="button"
            className="rounded-lg p-2 text-muted hover:bg-slate-100"
            onClick={(e) => {
              e.stopPropagation();
              setMenuRowId(menuRowId === r.id ? null : r.id);
            }}
          >
            <MoreVertical size={16} />
          </button>
          {menuRowId === r.id ? (
            <div
              className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-border bg-white py-1 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <MenuAction label="View Account" onClick={() => { setDrawer(r); setMenuRowId(null); }} />
              <MenuAction
                label="Collect Payment"
                onClick={() => {
                  setCollectPrefill(r);
                  setCollectOpen(true);
                  setMenuRowId(null);
                }}
              />
              <MenuAction label="Payment History" onClick={() => { setDrawer(r); setMenuRowId(null); }} />
              <MenuAction label="View Receipts" onClick={() => { setDrawer(r); setMenuRowId(null); }} />
              <MenuAction
                label="Send Reminder"
                onClick={() => {
                  setSelected(new Set([r.id]));
                  setReminderOpen(true);
                  setMenuRowId(null);
                }}
              />
            </div>
          ) : null}
        </div>
      ),
    },
  ];

  const selectedStudentIds = rows.filter((r) => selected.has(r.id)).map((r) => r.studentId);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <FeesPageTitle>Fee Collection</FeesPageTitle>
          <p className="text-sm text-muted">
            Record and manage student fee payments connected to the active fee structures.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setCollectPrefill(null);
              setCollectOpen(true);
            }}
          >
            <Plus size={16} /> Collect Payment
          </button>
          <div className="relative">
            <button type="button" className="btn-secondary" onClick={() => setExportOpen((o) => !o)}>
              Export <ChevronDown size={14} />
            </button>
            {exportOpen ? (
              <div className="absolute right-0 z-20 mt-1 w-40 rounded-xl border border-border bg-white py-1 shadow-lg">
                <button type="button" className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-50" onClick={() => void exportCsv()}>
                  <Download size={14} className="mr-2 inline" /> Excel (CSV)
                </button>
                <button
                  type="button"
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => {
                    window.print();
                    setExportOpen(false);
                  }}
                >
                  <Download size={14} className="mr-2 inline" /> PDF (Print)
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {summary ? (
        <StatsGrid columns={3}>
          <StatCard label="Total Expected" value={fmtMoney(summary.totalExpected)} />
          <StatCard label="Total Paid" value={fmtMoney(summary.totalPaid)} />
          <StatCard label="Remaining" value={fmtMoney(summary.remaining)} />
          <StatCard label="Students Paid" value={summary.studentsPaid} />
          <StatCard label="Partially Paid" value={summary.studentsPartial} />
          <StatCard label="Not Paid" value={summary.studentsNotPaid} />
        </StatsGrid>
      ) : null}

      <div className="hr-card space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <FilterSelect
            label="Academic Year"
            value={filters.academicYear}
            onChange={(v) => setFilters((f) => ({ ...f, academicYear: v }))}
            options={[{ value: 'all', label: 'All years' }, ...(ctx?.academicYears ?? []).map((y) => ({ value: y, label: y }))]}
          />
          <FilterSelect
            label="Term"
            value={filters.term}
            onChange={(v) => setFilters((f) => ({ ...f, term: v }))}
            options={[{ value: 'all', label: 'All terms' }, ...(ctx?.terms ?? []).map((t) => ({ value: t, label: t }))]}
          />
          <FilterSelect
            label="Class"
            value={filters.className}
            onChange={(v) => setFilters((f) => ({ ...f, className: v }))}
            options={[
              { value: 'all', label: 'All classes' },
              ...(ctx?.classes ?? []).map((c) => ({ value: c.label, label: c.label })),
            ]}
          />
          <FilterSelect
            label="Payment Status"
            value={filters.paymentStatus}
            onChange={(v) => setFilters((f) => ({ ...f, paymentStatus: v }))}
            options={STATUS_OPTIONS}
          />
          <FilterSelect
            label="Payment Method"
            value={filters.method}
            onChange={(v) => setFilters((f) => ({ ...f, method: v }))}
            options={PAYMENT_METHODS}
          />
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted">From</span>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted">To</span>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="w-full rounded-xl border border-border py-2 pl-9 pr-3 text-sm"
              placeholder="Search student name, code, SDMS code, parent phone…"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>
          <button type="button" className="btn-secondary text-xs" onClick={() => void load()}>
            <RefreshCw size={14} /> Refresh
          </button>
          {selected.size > 0 ? (
            <>
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => setReminderOpen(true)}
              >
                <Bell size={14} /> Send Reminder ({selected.size})
              </button>
              <button type="button" className="btn-secondary text-xs" onClick={() => void exportCsv()}>
                Export Selected
              </button>
            </>
          ) : null}
        </div>
      </div>

      <FeesDataTable
        columns={columns}
        data={paged}
        rowKey={(r) => r.id}
        page={page}
        totalPages={Math.max(1, Math.ceil(rows.length / pageSize))}
        total={rows.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        loading={loading}
        emptyMessage="No students match your filters — try adjusting academic year, term, or search"
        onRowClick={(r) => setDrawer(r)}
        selected={selected}
        onSelectRow={toggleSelect}
        onSelectAll={toggleSelectAll}
        allSelected={allSelected}
      />

      <StudentFinancialDrawer
        studentId={drawer?.studentId ?? null}
        studentCode={drawer?.studentCode}
        academicYear={drawer?.academicYear}
        term={drawer?.term}
        className={drawer?.className ?? undefined}
        studentName={drawer?.studentName}
        onClose={() => setDrawer(null)}
        onCollectPayment={() => {
          if (drawer) {
            setCollectPrefill(drawer);
            setCollectOpen(true);
          }
        }}
      />

      <CollectPaymentModal
        open={collectOpen}
        prefill={collectPrefill}
        defaultAcademicYear={filters.academicYear !== 'all' ? filters.academicYear : ctx?.currentAcademicYear ?? undefined}
        defaultTerm={filters.term !== 'all' ? filters.term : ctx?.currentTerm ?? undefined}
        onClose={() => {
          setCollectOpen(false);
          setCollectPrefill(null);
        }}
        onSuccess={() => {
          setCollectOpen(false);
          setCollectPrefill(null);
          void load();
        }}
      />

      <SendReminderModal
        open={reminderOpen}
        onClose={() => setReminderOpen(false)}
        studentIds={selectedStudentIds.length ? selectedStudentIds : rows.slice(0, 5).map((r) => r.studentId)}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</span>
      <select
        className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function MenuAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="block w-full px-4 py-2 text-left text-sm text-navy hover:bg-slate-50"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
