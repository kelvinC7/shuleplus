'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/shared/notifications';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { FeesDataTable, type FeesTableColumn } from '@/components/fees-data-table';
import { StudentFinancialDrawer } from '@/modules/collections/student-financial-drawer';
import { InstallmentPlanDrawer } from '@/modules/collections/installment-plan-drawer';
import { PlanStatusBadge } from '@/modules/collections/risk-badge';
import { CreateInstallmentModal } from '@/modules/collections/create-installment-modal';
import { FeesPageTitle } from '@/components/fees-page-title';

type PlanRow = {
  id: string;
  studentId: string;
  studentName: string;
  className: string | null;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  progress: number;
  nextDue: string | null;
  displayStatus: string;
  frequency: string;
};

type Summary = {
  activePlans: number;
  dueThisWeek: number;
  overdue: number;
  collectedThisMonth: number;
  expectedThisMonth: number;
  collectionRate: number;
};

export function InstallmentsView({ embedded = false }: { embedded?: boolean }) {
  const toast = useToast();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: 'all', className: 'all', frequency: 'all' });
  const [viewPlanId, setViewPlanId] = useState<string | null>(null);
  const [viewStudentId, setViewStudentId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.search.trim()) params.search = filters.search.trim();
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.className !== 'all') params.className = filters.className;
      if (filters.frequency !== 'all') params.frequency = filters.frequency;
      const { data } = await api.get('/installments', { params });
      setSummary(data.data?.summary ?? null);
      setPlans(data.data?.plans ?? []);
    } catch {
      toast.error('Could not load installment plans');
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: FeesTableColumn<PlanRow>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (r) => (
        <div>
          <p className="font-semibold text-navy">{r.studentName}</p>
          <p className="text-xs text-muted">{r.className ?? '—'}</p>
        </div>
      ),
    },
    { key: 'class', header: 'Class', render: (r) => r.className ?? '—' },
    {
      key: 'total',
      header: 'Total Fee',
      render: (r) => <span className="font-medium tabular-nums">{r.totalAmount.toLocaleString()} RWF</span>,
    },
    {
      key: 'paid',
      header: 'Paid',
      render: (r) => <span className="text-emerald-700 tabular-nums">{r.paidAmount.toLocaleString()} RWF</span>,
    },
    {
      key: 'remaining',
      header: 'Remaining',
      render: (r) => <span className="font-bold tabular-nums text-navy">{r.remaining.toLocaleString()} RWF</span>,
    },
    {
      key: 'next',
      header: 'Next Due',
      render: (r) =>
        r.nextDue ? new Date(r.nextDue).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—',
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (r) => (
        <div className="min-w-[80px]">
          <div className="h-1.5 rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-primary" style={{ width: `${r.progress}%` }} />
          </div>
          <span className="text-xs text-muted">{r.progress}%</span>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (r) => <PlanStatusBadge status={r.displayStatus} /> },
  ];

  const paged = plans.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <FeesPageTitle>Installment Plans</FeesPageTitle>
          <p className="text-sm text-muted">Structured payment plans with due-date tracking and reminders</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Create Payment Plan
        </button>
      </div>

      {summary ? (
        <StatsGrid columns={3}>
          <StatCard label="Active Plans" value={summary.activePlans} />
          <StatCard label="Due This Week" value={summary.dueThisWeek} />
          <StatCard label="Overdue" value={summary.overdue} />
          <StatCard label="Collected This Month" value={`${(summary.collectedThisMonth / 1_000_000).toFixed(1)}M RWF`} />
          <StatCard label="Expected This Month" value={`${(summary.expectedThisMonth / 1_000_000).toFixed(1)}M RWF`} />
          <StatCard label="Collection Rate" value={`${summary.collectionRate}%`} />
        </StatsGrid>
      ) : null}

      <div className="hr-card space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="w-full rounded-xl border border-border py-2 pl-9 pr-3 text-sm"
              placeholder="Student name / code / phone"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>
          <select className="rounded-xl border border-border px-3 py-2 text-sm" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            <option value="all">All statuses</option>
            <option value="overdue">Overdue</option>
            <option value="due_soon">Due Soon</option>
            <option value="completed">Completed</option>
            <option value="on_track">On Track</option>
          </select>
          <select className="rounded-xl border border-border px-3 py-2 text-sm" value={filters.frequency} onChange={(e) => setFilters((f) => ({ ...f, frequency: e.target.value }))}>
            <option value="all">All frequencies</option>
            <option value="WEEKLY">Weekly</option>
            <option value="BIWEEKLY">Bi-weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="CUSTOM">Custom</option>
          </select>
          <button type="button" className="btn-secondary text-xs" onClick={() => void load()}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <FeesDataTable
        columns={columns}
        data={paged}
        rowKey={(r) => r.id}
        page={page}
        totalPages={Math.max(1, Math.ceil(plans.length / pageSize))}
        total={plans.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onRowClick={(r) => setViewPlanId(r.id)}
        loading={loading}
        emptyMessage="No payment plans yet — create one for a student who cannot pay in full"
        emptyAction={
          <button type="button" className="btn-primary text-sm" onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> Create Payment Plan
          </button>
        }
      />

      <InstallmentPlanDrawer
        planId={viewPlanId}
        onClose={() => setViewPlanId(null)}
        onOpenStudent={(id) => {
          setViewPlanId(null);
          setViewStudentId(id);
        }}
      />
      <StudentFinancialDrawer studentId={viewStudentId} onClose={() => setViewStudentId(null)} />
      <CreateInstallmentModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          void load();
          toast.success('Payment plan created');
        }}
      />
    </div>
  );
}
