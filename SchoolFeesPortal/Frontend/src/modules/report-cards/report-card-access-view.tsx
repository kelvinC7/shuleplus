'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/shared/notifications';
import { FeesPageTitle } from '@/components/fees-page-title';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { FeesDataTable, type FeesTableColumn } from '@/components/fees-data-table';

type Row = {
  studentId: string;
  studentCode: string;
  studentName: string;
  className: string;
  academicPublished: boolean;
  paymentStatus: string;
  balance: number;
  allowed: boolean;
  blockReason: string | null;
  hasActiveLoan: boolean;
};

type Preview = {
  academicYear: string;
  term: string;
  totals: { total: number; published: number; allowed: number; blocked: number; unpaid: number };
  students: Row[];
  policy: { requireFeesClearance: boolean; blockWhenLoanActive: boolean };
};

type Policy = { requireFeesClearance: boolean; blockWhenLoanActive: boolean };

export function ReportCardAccessView() {
  const toast = useToast();
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [term, setTerm] = useState('Term 1');
  const [className, setClassName] = useState('');
  const [search, setSearch] = useState('');
  const [accessFilter, setAccessFilter] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [policy, setPolicy] = useState<Policy>({ requireFeesClearance: true, blockWhenLoanActive: true });
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadPolicy = useCallback(async () => {
    try {
      const res = await api.get<{ data: Policy }>('/report-cards/access/policy');
      setPolicy(res.data.data);
    } catch {
      /* keep defaults */
    }
  }, []);

  useEffect(() => {
    void loadPolicy();
  }, [loadPolicy]);

  async function updatePolicy(patch: Partial<Policy>) {
    const next = { ...policy, ...patch };
    setSavingPolicy(true);
    try {
      const res = await api.put<{ data: Policy }>('/report-cards/access/policy', next);
      setPolicy(res.data.data);
      toast.success('Access policy updated');
      void load();
    } catch {
      toast.error('Could not save policy');
    } finally {
      setSavingPolicy(false);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: Preview }>('/report-cards/access', {
        params: { academicYear, term, className: className || undefined, search: search || undefined, accessFilter: accessFilter || undefined },
      });
      setPreview(res.data.data);
    } catch {
      toast.error('Could not load report access list');
    } finally {
      setLoading(false);
    }
  }, [academicYear, term, className, search, accessFilter, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function allowManual(row: Row) {
    try {
      await api.post('/report-cards/access/exception', {
        studentId: row.studentId,
        studentCode: row.studentCode,
        academicYear,
        term,
        decision: 'MANUALLY_ALLOWED',
        exceptionReason: 'Parent payment agreement',
        exceptionNote: 'Manual approval to view report card',
      });
      toast.success('Manual access granted');
      void load();
    } catch {
      toast.error('Could not save exception');
    }
  }

  const columns: FeesTableColumn<Row>[] = [
    { key: 'studentName', header: 'Student', render: (r) => <span className="font-semibold text-navy">{r.studentName || r.studentCode}</span> },
    { key: 'className', header: 'Class' },
    {
      key: 'academicPublished',
      header: 'Published',
      render: (r) => (
        <span className={r.academicPublished ? 'text-emerald-700' : 'text-slate-400'}>
          {r.academicPublished ? 'Yes' : 'No'}
        </span>
      ),
    },
    { key: 'paymentStatus', header: 'Fees' },
    {
      key: 'balance',
      header: 'Balance',
      render: (r) => <span className="tabular-nums">{r.balance.toLocaleString()}</span>,
    },
    {
      key: 'allowed',
      header: 'Portal access',
      render: (r) => (
        <span className={r.allowed ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800' : 'rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800'}>
          {r.allowed ? 'Allowed' : 'Blocked'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (r) =>
        !r.allowed ? (
          <button type="button" className="text-xs font-bold text-primary hover:underline" onClick={() => void allowManual(r)}>
            Allow manually
          </button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-navy">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <FeesPageTitle as="h1" className="text-2xl font-bold text-navy">
            Report card access
          </FeesPageTitle>
          <p className="mt-1 text-sm text-muted">
            Published reports from Academic · fees clearance · manual agreements
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">Portal access policy</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-white p-4">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-[#FCB038]"
              checked={policy.requireFeesClearance}
              disabled={savingPolicy}
              onChange={(e) => void updatePolicy({ requireFeesClearance: e.target.checked })}
            />
            <span>
              <span className="block text-sm font-semibold text-navy">Require fees clearance for reports</span>
              <span className="mt-0.5 block text-xs text-muted">
                When on, parents must clear outstanding fees before opening report cards (unless manually allowed).
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-white p-4">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-[#FCB038]"
              checked={policy.blockWhenLoanActive}
              disabled={savingPolicy}
              onChange={(e) => void updatePolicy({ blockWhenLoanActive: e.target.checked })}
            />
            <span>
              <span className="block text-sm font-semibold text-navy">Block when active fees loan</span>
              <span className="mt-0.5 block text-xs text-muted">
                Block report access while a school-fees loan is under review, approved, or disbursed.
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-white p-4">
        <input className="input min-w-[140px] flex-1 text-sm" placeholder="Academic year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
        <input className="input min-w-[100px] text-sm" placeholder="Term" value={term} onChange={(e) => setTerm(e.target.value)} />
        <input className="input min-w-[100px] text-sm" placeholder="Class (optional)" value={className} onChange={(e) => setClassName(e.target.value)} />
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="input w-full pl-9 text-sm" placeholder="Search student…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input text-sm" value={accessFilter} onChange={(e) => setAccessFilter(e.target.value)}>
          <option value="">All</option>
          <option value="allowed">Allowed</option>
          <option value="blocked">Blocked</option>
          <option value="published">Published only</option>
          <option value="unpaid">Unpaid fees</option>
        </select>
        <button type="button" className="btn-primary py-2 text-sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {preview ? (
        <StatsGrid>
          <StatCard label="Published" value={preview.totals.published} />
          <StatCard label="Allowed" value={preview.totals.allowed} />
          <StatCard label="Blocked" value={preview.totals.blocked} />
          <StatCard label="Unpaid" value={preview.totals.unpaid} />
        </StatsGrid>
      ) : null}

      <FeesDataTable columns={columns} rows={preview?.students ?? []} loading={loading} emptyMessage="Select class or wait for Academic to publish reports." />
    </div>
  );
}
