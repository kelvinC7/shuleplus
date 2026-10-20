'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/services/api';
import { useToast } from '@/shared/notifications';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { FeesDataTable, type FeesTableColumn } from '@/components/fees-data-table';
import { RiskBadge } from '@/modules/collections/risk-badge';
import { StudentFinancialDrawer } from '@/modules/collections/student-financial-drawer';
import { SendReminderModal } from '@/modules/collections/send-reminder-modal';
import { FeesPageTitle } from '@/components/fees-page-title';

type BillRow = {
  id: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  className: string | null;
  academicYear: string;
  term: string;
  billNumber: string;
  balance: number;
  paidAmount: number;
  netAmount: number;
  dueDate: string | null;
  daysOverdue: number;
  risk: string;
};

type DrawerStudent = {
  studentId: string;
  studentCode: string;
  studentName: string;
  className: string | null;
  academicYear: string;
  term: string;
};

type Summary = {
  totalOutstanding: number;
  studentsWithBalance: number;
  overdueAmount: number;
  dueSoonAmount: number;
  criticalAmount: number;
  collectionRate: number;
};

function formatRwf(value: number) {
  return `${value.toLocaleString()} RWF`;
}

export function OutstandingView() {
  const toast = useToast();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [bills, setBills] = useState<BillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', risk: 'all' });
  const [viewStudent, setViewStudent] = useState<DrawerStudent | null>(null);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.search.trim()) params.search = filters.search.trim();
      if (filters.risk !== 'all') params.risk = filters.risk;
      const { data } = await api.get('/outstanding', { params });
      setSummary(data.data?.summary ?? null);
      setBills(data.data?.bills ?? []);
    } catch {
      toast.error('Could not load outstanding balances');
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const columns: FeesTableColumn<BillRow>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (r) => (
        <div>
          <p className="font-semibold text-navy">{r.studentName}</p>
          <p className="text-xs text-muted">{r.studentCode} · {r.className ?? '—'}</p>
        </div>
      ),
    },
    { key: 'bill', header: 'Bill', render: (r) => r.billNumber },
    {
      key: 'period',
      header: 'Period',
      render: (r) => `${r.academicYear} · ${r.term}`,
    },
    {
      key: 'total',
      header: 'Bill total',
      render: (r) => <span className="tabular-nums">{r.netAmount.toLocaleString()} RWF</span>,
    },
    {
      key: 'paid',
      header: 'Paid',
      render: (r) => <span className="text-emerald-700 tabular-nums">{r.paidAmount.toLocaleString()} RWF</span>,
    },
    {
      key: 'balance',
      header: 'Outstanding',
      render: (r) => <span className="font-bold tabular-nums text-red-700">{r.balance.toLocaleString()} RWF</span>,
    },
    {
      key: 'due',
      header: 'Due',
      render: (r) =>
        r.dueDate ? new Date(r.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—',
    },
    {
      key: 'overdue',
      header: 'Days overdue',
      render: (r) => (r.daysOverdue > 0 ? <span className="font-semibold text-red-600">{r.daysOverdue}d</span> : '—'),
    },
    { key: 'risk', header: 'Risk', render: (r) => <RiskBadge risk={r.risk} /> },
  ];

  const paged = bills.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <FeesPageTitle>Outstanding Balances</FeesPageTitle>
          <p className="text-sm text-muted">Live balances from Student Management and fee structures</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={!bills.length}
            onClick={() => {
              setSelectedIds(bills.map((b) => b.studentId));
              setReminderOpen(true);
            }}
          >
            <Bell size={16} /> Remind all ({bills.length})
          </button>
          <Link href="/notifications" className="btn-secondary">
            Automations
          </Link>
        </div>
      </div>

      {summary ? (
        <StatsGrid columns={3}>
          <StatCard label="Total Outstanding" value={formatRwf(summary.totalOutstanding)} />
          <StatCard label="Students With Balance" value={summary.studentsWithBalance} />
          <StatCard label="Overdue" value={formatRwf(summary.overdueAmount)} />
          <StatCard label="Due Soon" value={formatRwf(summary.dueSoonAmount)} />
          <StatCard label="Critical" value={formatRwf(summary.criticalAmount)} />
          <StatCard label="Collection Rate" value={`${summary.collectionRate}%`} />
        </StatsGrid>
      ) : null}

      <div className="hr-card space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="w-full rounded-xl border border-border py-2 pl-9 pr-3 text-sm"
              placeholder="Search by student name or code"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>
          <select
            className="rounded-xl border border-border px-3 py-2 text-sm"
            value={filters.risk}
            onChange={(e) => setFilters((f) => ({ ...f, risk: e.target.value }))}
          >
            <option value="all">All risk levels</option>
            <option value="critical">Critical</option>
            <option value="at_risk">At Risk</option>
            <option value="attention">Attention</option>
            <option value="normal">Normal</option>
          </select>
        </div>
        <button type="button" className="btn-secondary text-xs" onClick={() => void load()}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <FeesDataTable
        columns={columns}
        data={paged}
        rowKey={(r) => r.id}
        page={page}
        totalPages={Math.max(1, Math.ceil(bills.length / pageSize))}
        total={bills.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onRowClick={(r) =>
          setViewStudent({
            studentId: r.studentId,
            studentCode: r.studentCode,
            studentName: r.studentName,
            className: r.className,
            academicYear: r.academicYear,
            term: r.term,
          })
        }
        loading={loading}
        emptyMessage="No outstanding balances for enrolled students"
      />

      <StudentFinancialDrawer
        studentId={viewStudent?.studentId ?? null}
        studentCode={viewStudent?.studentCode}
        studentName={viewStudent?.studentName}
        className={viewStudent?.className ?? undefined}
        academicYear={viewStudent?.academicYear}
        term={viewStudent?.term}
        onClose={() => setViewStudent(null)}
        tab="outstanding"
      />
      <SendReminderModal
        open={reminderOpen}
        onClose={() => setReminderOpen(false)}
        studentIds={selectedIds}
        studentLabels={bills.filter((b) => selectedIds.includes(b.studentId)).map((b) => `${b.studentName} — ${b.balance.toLocaleString()} RWF`)}
      />
    </div>
  );
}
