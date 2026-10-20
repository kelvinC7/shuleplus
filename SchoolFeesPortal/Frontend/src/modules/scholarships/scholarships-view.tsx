'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/shared/notifications';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { FeesDataTable, type FeesTableColumn } from '@/components/fees-data-table';
import { StatusBadge } from '@/components/status-badge';
import { StudentFinancialDrawer } from '@/modules/collections/student-financial-drawer';
import { FeesPageTitle } from '@/components/fees-page-title';
import { CreateScholarshipModal } from '@/modules/collections/create-scholarship-modal';

type Scholarship = {
  id: string;
  studentId: string;
  studentName: string;
  className?: string | null;
  type: string;
  academicYear: string;
  term?: string | null;
  amount: number;
  allocated: number;
  remaining: number;
  status: string;
  sponsor?: { name: string } | null;
  studentCode?: string;
};

type Summary = {
  activeScholarships: number;
  studentsSupported: number;
  totalAwarded: number;
  pendingApproval: number;
};

const TYPE_LABELS: Record<string, string> = {
  FULL: 'Full Scholarship',
  PARTIAL: 'Partial Scholarship',
  MERIT: 'Academic Excellence',
  SPORTS: 'Sports Scholarship',
  NEED_BASED: 'Need-Based Support',
  STAFF_CHILD: 'Staff Child Discount',
  SIBLING: 'Sibling Discount',
  GOVERNMENT: 'Government / Institution',
  SPECIAL: 'Special Assistance',
  CUSTOM: 'Custom',
};

export function ScholarshipsView() {
  const toast = useToast();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [types, setTypes] = useState<string[]>([]);
  const [rows, setRows] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [viewStudent, setViewStudent] = useState<{ studentId: string; studentCode?: string; studentName?: string; className?: string | null; academicYear?: string; term?: string } | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  async function approve(id: string) {
    setActionId(id);
    try {
      await api.post(`/scholarships/${id}/approve`);
      toast.success('Scholarship approved and applied');
      void load();
    } catch {
      toast.error('Approval failed');
    } finally {
      setActionId(null);
    }
  }

  async function reject(id: string) {
    const reason = window.prompt('Rejection reason?') ?? 'Not approved';
    setActionId(id);
    try {
      await api.post(`/scholarships/${id}/reject`, { reason });
      toast.success('Scholarship rejected');
      void load();
    } catch {
      toast.error('Rejection failed');
    } finally {
      setActionId(null);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/scholarships');
      setSummary(data.data?.summary ?? null);
      setTypes(data.data?.types ?? []);
      setRows(data.data?.scholarships ?? []);
    } catch {
      toast.error('Could not load scholarships');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.studentName.toLowerCase().includes(q) ||
      r.studentId.toLowerCase().includes(q) ||
      (r.studentCode?.toLowerCase().includes(q) ?? false)
    );
  });
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const columns: FeesTableColumn<Scholarship>[] = [
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
      key: 'type',
      header: 'Type',
      render: (r) => TYPE_LABELS[r.type] ?? r.type.replace(/_/g, ' '),
    },
    {
      key: 'coverage',
      header: 'Coverage',
      render: (r) => {
        const pct = r.amount > 0 ? Math.round((r.allocated / r.amount) * 100) : 0;
        return `${pct}%`;
      },
    },
    {
      key: 'award',
      header: 'Award',
      render: (r) => <span className="font-bold tabular-nums">{r.allocated.toLocaleString()} RWF</span>,
    },
    {
      key: 'period',
      header: 'Period',
      render: (r) => `${r.term ?? 'Year'} · ${r.academicYear}`,
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) =>
        ['UNDER_REVIEW', 'DRAFT', 'PENDING'].includes(r.status) ? (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800 disabled:opacity-50" disabled={actionId === r.id} onClick={() => void approve(r.id)}>Approve</button>
            <button type="button" className="rounded-lg bg-red-100 px-2 py-1 text-xs font-semibold text-red-800 disabled:opacity-50" disabled={actionId === r.id} onClick={() => void reject(r.id)}>Reject</button>
          </div>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <FeesPageTitle>Scholarship & Financial Aid</FeesPageTitle>
          <p className="text-sm text-muted">Types, awards, eligibility rules & approval workflow</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Create Scholarship
        </button>
      </div>

      {summary ? (
        <StatsGrid columns={4}>
          <StatCard label="Active Scholarships" value={summary.activeScholarships} />
          <StatCard label="Students Supported" value={summary.studentsSupported} />
          <StatCard label="Total Awarded" value={`${(summary.totalAwarded / 1_000_000).toFixed(1)}M RWF`} />
          <StatCard label="Pending Approval" value={summary.pendingApproval} />
        </StatsGrid>
      ) : null}

      {types.length > 0 ? (
        <div className="hr-card p-4">
          <h3 className="text-sm font-bold text-navy">Scholarship types</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {types.map((t) => (
              <span
                key={t}
                className="rounded-full border border-border bg-slate-50 px-3 py-1 text-xs font-semibold text-navy"
              >
                {TYPE_LABELS[t] ?? t}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="hr-card space-y-3 p-4">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="w-full rounded-xl border border-border py-2 pl-9 pr-3 text-sm"
            placeholder="Search student"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
        totalPages={Math.max(1, Math.ceil(filtered.length / pageSize))}
        total={filtered.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onRowClick={(r) =>
          setViewStudent({
            studentId: r.studentId,
            studentCode: r.studentCode ?? r.studentId,
            studentName: r.studentName,
            className: r.className,
            academicYear: r.academicYear,
            term: r.term ?? undefined,
          })
        }
        loading={loading}
        emptyMessage="No scholarships recorded"
      />

      <StudentFinancialDrawer
        studentId={viewStudent?.studentId ?? null}
        studentCode={viewStudent?.studentCode}
        studentName={viewStudent?.studentName}
        className={viewStudent?.className ?? undefined}
        academicYear={viewStudent?.academicYear}
        term={viewStudent?.term}
        onClose={() => setViewStudent(null)}
      />
      <CreateScholarshipModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          toast.success('Scholarship saved');
          void load();
        }}
      />
    </div>
  );
}
