'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye } from 'lucide-react';
import { ModulePage } from '@/components/ui/module-page';
import { NesaDataTable, StatusPill } from '@/components/ui/nesa-data-table';
import { CircularPreviewModal } from '@/components/circular-preview-modal';
import { nesaApi, type CircularListItem, type SchoolListItem } from '@/services/nesa-api';

const PAGE_SIZE = 10;

function SchoolCircularsInner() {
  const searchParams = useSearchParams();
  const schoolId = searchParams.get('schoolId') ?? '';
  const [schools, setSchools] = useState<SchoolListItem[]>([]);
  const [selected, setSelected] = useState(schoolId);
  const [rows, setRows] = useState<CircularListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    void nesaApi.listSchools({ status: 'ACTIVE' }).then((r) => setSchools(r.data.data ?? []));
  }, []);

  useEffect(() => {
    if (!selected) {
      setRows([]);
      return;
    }
    setLoading(true);
    void nesaApi
      .listCirculars({ organizationId: selected })
      .then((r) => {
        const sorted = [...(r.data.data ?? [])].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setRows(sorted);
        setPage(1);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [selected]);

  const pageRows = useMemo(
    () => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [rows, page]
  );

  return (
    <ModulePage title="School circulars" subtitle="Circulars for one registered school">
      <label className="nesa-card block max-w-xl !p-4">
        <span className="mb-1 block text-[11px] font-semibold uppercase text-navy/45">School</span>
        <select
          className="nesa-input"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Select a school…</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <NesaDataTable
        title="Circulars"
        columns={[
          {
            key: 'class',
            header: 'Class',
            render: (c) => <span className="font-semibold">{c.className}</span>,
          },
          {
            key: 'period',
            header: 'Period',
            render: (c) => `${c.academicYear} · ${c.term}`,
          },
          { key: 'status', header: 'Status', render: (c) => <StatusPill status={c.status} /> },
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
                  onClick={() => setPreviewId(c.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-navy/10 px-3 py-1.5 text-xs font-semibold"
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
        rowKey={(r) => r.id}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={rows.length}
        onPageChange={setPage}
        emptyMessage={selected ? 'No circulars for this school.' : 'Select a school first.'}
      />
      <CircularPreviewModal circularId={previewId} onClose={() => setPreviewId(null)} />
    </ModulePage>
  );
}

export default function SchoolCircularsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-navy/45">Loading…</p>}>
      <SchoolCircularsInner />
    </Suspense>
  );
}
