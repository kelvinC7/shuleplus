'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  RefreshCw,
  RotateCcw,
  Search,
  XCircle,
} from 'lucide-react';
import { NesaDataTable, StatusPill } from '@/components/ui/nesa-data-table';
import { nesaApi, type CircularListItem } from '@/services/nesa-api';

const PAGE_SIZE = 10;

export type ApprovalStatusFilter =
  | 'all'
  | 'pending'
  | 'under-review'
  | 'returned'
  | 'approved'
  | 'rejected';

const FILTER_OPTIONS: { value: ApprovalStatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'under-review', label: 'Under review' },
  { value: 'returned', label: 'Returned' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

function matchesFilter(row: CircularListItem, filter: ApprovalStatusFilter): boolean {
  const status = (row.status ?? '').toUpperCase();
  const nesa = (row.nesaStatus ?? '').toUpperCase();

  switch (filter) {
    case 'all':
      return status !== 'DRAFT';
    case 'pending':
      return status === 'PENDING' && !row.requestIncrease;
    case 'under-review':
      return status === 'PENDING' && Boolean(row.requestIncrease);
    case 'returned':
      return nesa === 'NOT_PUBLISHED' || status === 'ARCHIVED';
    case 'approved':
      return status === 'APPROVED' || status === 'PUBLISHED' || nesa === 'APPROVED';
    case 'rejected':
      return status === 'REJECTED' || nesa === 'REJECTED';
    default:
      return true;
  }
}

function countFor(rows: CircularListItem[], filter: ApprovalStatusFilter) {
  return rows.filter((r) => matchesFilter(r, filter)).length;
}

const KPI_META: Record<
  Exclude<ApprovalStatusFilter, 'all'>,
  { label: string; icon: typeof Clock; tint: string }
> = {
  pending: { label: 'Pending', icon: Clock, tint: 'from-amber-500/15 to-amber-500/5' },
  'under-review': { label: 'Under review', icon: Eye, tint: 'from-sky-500/15 to-sky-500/5' },
  returned: { label: 'Returned', icon: RotateCcw, tint: 'from-navy/10 to-navy/[0.03]' },
  approved: { label: 'Approved', icon: CheckCircle2, tint: 'from-emerald-500/15 to-emerald-500/5' },
  rejected: { label: 'Rejected', icon: XCircle, tint: 'from-rose-500/15 to-rose-500/5' },
};

interface ApprovalsDashboardProps {
  initialFilter?: ApprovalStatusFilter;
}

export function ApprovalsDashboard({ initialFilter = 'all' }: ApprovalsDashboardProps) {
  const router = useRouter();
  const [rows, setRows] = useState<CircularListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ApprovalStatusFilter>(initialFilter);
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    try {
      const res = await nesaApi.listCirculars({ limit: '500' });
      setRows(res.data.data ?? []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  function setFilterAndUrl(next: ApprovalStatusFilter) {
    setFilter(next);
    const qs = next === 'all' ? '' : `?status=${encodeURIComponent(next)}`;
    router.replace(`/nesa/approvals${qs}`, { scroll: false });
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (!matchesFilter(r, filter)) return false;
      if (!q) return true;
      return (
        r.schoolName.toLowerCase().includes(q) ||
        r.className.toLowerCase().includes(q) ||
        (r.schoolCode ?? '').toLowerCase().includes(q)
      );
    });
  }, [rows, filter, search]);

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const kpiKeys = Object.keys(KPI_META) as Exclude<ApprovalStatusFilter, 'all'>[];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[200px] flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/35" />
          <input
            className="nesa-input w-full pl-9"
            placeholder="Search school or class…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              className="nesa-input appearance-none pr-9 font-semibold"
              value={filter}
              onChange={(e) => setFilterAndUrl(e.target.value as ApprovalStatusFilter)}
              aria-label="Filter by status"
            >
              {FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-navy/40"
              aria-hidden
            />
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-navy/10 bg-white px-3 py-2 text-sm font-semibold text-navy"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {kpiKeys.map((key) => {
          const meta = KPI_META[key];
          const Icon = meta.icon;
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilterAndUrl(key)}
              className={`rounded-2xl border bg-gradient-to-br p-4 text-left transition shadow-[0_12px_40px_-28px_rgba(0,4,53,0.35)] ${meta.tint} ${
                active ? 'border-primary/50 ring-2 ring-primary/25' : 'border-navy/[0.06] hover:border-primary/30'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-navy/50">{meta.label}</p>
                <Icon size={16} className="text-primary" aria-hidden />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-navy">{countFor(rows, key)}</p>
            </button>
          );
        })}
      </div>

      <NesaDataTable
        title="Inbox"
        subtitle="Babyeyi circulars awaiting NESA action"
        columns={[
          {
            key: 'school',
            header: 'School',
            render: (c) => (
              <div>
                <p className="font-semibold text-navy">{c.schoolName}</p>
                <p className="text-xs text-navy/45">
                  {c.className} · {c.academicYear} T{c.term}
                </p>
              </div>
            ),
          },
          {
            key: 'fee',
            header: 'Fee',
            render: (c) =>
              c.totalFee != null ? (
                <span className="font-semibold tabular-nums text-navy">
                  {Number(c.totalFee).toLocaleString()} RWF
                </span>
              ) : (
                <span className="text-navy/35">—</span>
              ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (c) => <StatusPill status={c.status} />,
          },
          {
            key: 'created',
            header: 'Submitted',
            render: (c) => (
              <span className="text-xs text-navy/50">{new Date(c.createdAt).toLocaleDateString()}</span>
            ),
          },
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (c) => (
              <Link
                href={`/nesa/circulars/${c.id}`}
                className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-primary"
              >
                Review
              </Link>
            ),
          },
        ]}
        rows={pageRows}
        rowKey={(r) => r.id}
        loading={loading}
        emptyMessage="No items for this filter."
        page={page}
        pageSize={PAGE_SIZE}
        total={filtered.length}
        onPageChange={setPage}
      />
    </div>
  );
}
