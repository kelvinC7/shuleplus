'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, RefreshCw, Search } from 'lucide-react';
import { ModulePage } from '@/components/ui/module-page';
import { KpiCard } from '@/components/ui/kpi-card';
import { NesaDataTable, StatusPill } from '@/components/ui/nesa-data-table';
import { CircularPreviewModal } from '@/components/circular-preview-modal';
import {
  nesaApi,
  type CircularListItem,
  type SchoolListItem,
} from '@/services/nesa-api';

const PAGE_SIZE = 10;

export default function CircularsListInner() {
  const searchParams = useSearchParams();
  const initialSchool = searchParams.get('schoolId') ?? '';

  const [schools, setSchools] = useState<SchoolListItem[]>([]);
  const [circulars, setCirculars] = useState<CircularListItem[]>([]);
  const [schoolId, setSchoolId] = useState(initialSchool);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');

  async function loadSchools() {
    try {
      const res = await nesaApi.listSchools({ status: 'ACTIVE' });
      setSchools(res.data.data ?? []);
    } catch {
      setSchools([]);
    }
  }

  async function loadCirculars(selectedSchool = schoolId) {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (selectedSchool) params.organizationId = selectedSchool;
      if (status) params.status = status;
      if (search.trim()) params.search = search.trim();
      const res = await nesaApi.listCirculars(params);
      // Latest created first (API already sorts; keep client-safe)
      const rows = [...(res.data.data ?? [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setCirculars(rows);
      setPage(1);
    } catch (err) {
      setCirculars([]);
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not load circulars from BabyeyiWizard'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSchools();
  }, []);

  useEffect(() => {
    void loadCirculars(schoolId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, status]);

  const schoolName = useMemo(() => {
    if (!schoolId) return 'All schools';
    return schools.find((s) => s.id === schoolId)?.name ?? 'Selected school';
  }, [schoolId, schools]);

  const byStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of circulars) counts[c.status] = (counts[c.status] ?? 0) + 1;
    return counts;
  }, [circulars]);

  const pageRows = circulars.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <ModulePage
      title="Circular list"
      subtitle="Babyeyi circulars — newest first. Filter by school and review or preview."
      actions={
        <button
          type="button"
          onClick={() => void loadCirculars()}
          className="inline-flex items-center gap-2 rounded-xl border border-navy/10 bg-white px-3 py-2 text-sm font-semibold text-navy"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Shown" value={circulars.length} />
        <KpiCard label="Pending" value={byStatus.PENDING ?? 0} />
        <KpiCard label="Published" value={byStatus.PUBLISHED ?? 0} />
        <KpiCard label="Rejected" value={byStatus.REJECTED ?? 0} />
      </div>

      <div className="nesa-card grid gap-3 !p-4 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
        <label>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy/45">
            School
          </span>
          <select
            className="nesa-input"
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
          >
            <option value="">All registered schools</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.district ? ` — ${s.district}` : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy/45">
            Status
          </span>
          <select className="nesa-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All (exclude drafts)</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="PUBLISHED">Published</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </label>
        <label className="relative">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy/45">
            Search
          </span>
          <Search size={14} className="absolute bottom-3 left-3 text-navy/35" />
          <input
            className="nesa-input pl-9"
            placeholder="Class, author, year…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void loadCirculars();
            }}
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => void loadCirculars()}
            className="w-full rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-primary"
          >
            Apply
          </button>
        </div>
      </div>

      <p className="text-sm text-navy/50">
        Viewing: <span className="font-semibold text-navy">{schoolName}</span>
        <span className="text-navy/35"> · sorted by latest created</span>
      </p>

      {error ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <NesaDataTable
        title="Circulars"
        subtitle="From BabyeyiWizard · newest created at the top"
        columns={[
          {
            key: 'school',
            header: 'School / class',
            render: (c) => (
              <div>
                <p className="font-semibold text-navy">{c.schoolName}</p>
                <p className="text-xs text-navy/45">
                  {c.className}
                  {c.district ? ` · ${c.district}` : ''}
                </p>
              </div>
            ),
          },
          {
            key: 'period',
            header: 'Year · term',
            render: (c) => (
              <span className="text-navy/75">
                {c.academicYear} · {c.term}
              </span>
            ),
          },
          {
            key: 'fee',
            header: 'Fee',
            render: (c) => (
              <span>
                {typeof c.totalFee === 'number' ? `${c.totalFee.toLocaleString()} RWF` : '—'}
                {c.requestIncrease ? (
                  <span className="ml-2 rounded-full bg-primary/25 px-2 py-0.5 text-[10px] font-bold">
                    Fee ↑
                  </span>
                ) : null}
              </span>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (c) => <StatusPill status={c.status} />,
          },
          {
            key: 'created',
            header: 'Created',
            render: (c) => (
              <span className="text-xs text-navy/50">{new Date(c.createdAt).toLocaleString()}</span>
            ),
          },
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (c) => (
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewId(c.id);
                    setPreviewTitle(`${c.schoolName} · ${c.className}`);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-navy/10 px-3 py-1.5 text-xs font-semibold text-navy"
                >
                  <Eye size={13} /> Preview
                </button>
                <Link
                  href={`/nesa/circulars/${c.id}`}
                  className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-primary"
                >
                  Review
                </Link>
              </div>
            ),
          },
        ]}
        rows={pageRows}
        rowKey={(c) => c.id}
        loading={loading}
        emptyMessage="No circulars for this filter."
        page={page}
        pageSize={PAGE_SIZE}
        total={circulars.length}
        onPageChange={setPage}
      />

      <CircularPreviewModal
        circularId={previewId}
        title={previewTitle}
        onClose={() => setPreviewId(null)}
      />
    </ModulePage>
  );
}
