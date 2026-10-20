'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { ModulePage } from '@/components/ui/module-page';
import { KpiCard } from '@/components/ui/kpi-card';
import { NesaDataTable, StatusPill } from '@/components/ui/nesa-data-table';
import { CircularPreviewModal } from '@/components/circular-preview-modal';
import { nesaApi, type CircularListItem } from '@/services/nesa-api';

const PAGE_SIZE = 10;

export default function CircularApprovalPage() {
  const [rows, setRows] = useState<CircularListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await nesaApi.listCirculars({ status: 'PENDING' });
        const sorted = [...(res.data.data ?? [])].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setRows(sorted);
      } catch (err) {
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Failed to load pending circulars'
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pageRows = useMemo(
    () => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [rows, page]
  );

  return (
    <ModulePage
      title="Circular approval"
      subtitle="Pending Babyeyi circulars awaiting NESA review — newest first"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <KpiCard label="Pending" value={rows.length} />
        <KpiCard label="Inbox" value="NESA stage" />
      </div>
      {error ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}
      <NesaDataTable
        title="Pending queue"
        columns={[
          {
            key: 'school',
            header: 'School / class',
            render: (c) => (
              <div>
                <p className="font-semibold">{c.schoolName}</p>
                <p className="text-xs text-navy/45">{c.className}</p>
              </div>
            ),
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
                  onClick={() => {
                    setPreviewId(c.id);
                    setPreviewTitle(`${c.schoolName} · ${c.className}`);
                  }}
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
        emptyMessage="No pending circulars."
      />
      <CircularPreviewModal
        circularId={previewId}
        title={previewTitle}
        onClose={() => setPreviewId(null)}
      />
    </ModulePage>
  );
}
