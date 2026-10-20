'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ModulePage } from '@/components/ui/module-page';
import { KpiCard } from '@/components/ui/kpi-card';
import { NesaDataTable, StatusPill } from '@/components/ui/nesa-data-table';
import { nesaApi, asList } from '@/services/nesa-api';
import type { GaPolicyRecord } from '@/lib/policy-constants';

const PAGE_SIZE = 10;

export default function GeneralAssemblyPoliciesPage() {
  const [rows, setRows] = useState<GaPolicyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await nesaApi.listGaPolicies();
      setRows(asList<GaPolicyRecord>(res.data.data));
      setError('');
    } catch (err) {
      setRows([]);
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to load General Assembly policies'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const safeRows = Array.isArray(rows) ? rows : [];
  const pageRows = useMemo(
    () => safeRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [safeRows, page]
  );

  return (
    <ModulePage
      title="General Assembly policies"
      subtitle="Add-on fee caps (e.g. up to RWF 7,000 per term) layered on top of tuition limits."
      actions={
        <Link
          href="/nesa/general-assembly-policies/create"
          className="rounded-lg bg-navy px-4 py-2 text-[13px] font-semibold text-white"
        >
          Create policy
        </Link>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <KpiCard label="Policies" value={safeRows.length} />
        <KpiCard
          label="Active"
          value={safeRows.filter((r) => r.status === 'ACTIVE').length}
        />
      </div>
      {error ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}
      <NesaDataTable
        title="General Assembly catalog"
        columns={[
          {
            key: 'levels',
            header: 'Levels',
            render: (r) => (r.levels ?? []).join(', '),
          },
          {
            key: 'ownership',
            header: 'Ownership',
            render: (r) =>
              (r.ownerships ?? []).map((o) => o.replaceAll('_', ' ')).join(', '),
          },
          {
            key: 'students',
            header: 'Students',
            render: (r) => (r.studentTypes ?? []).join(', '),
          },
          {
            key: 'max',
            header: 'Max amount',
            render: (r) => `${Number(r.maxAmountRwf).toLocaleString()} RWF`,
          },
          {
            key: 'status',
            header: 'Status',
            render: (r) => <StatusPill status={r.status} />,
          },
          {
            key: 'actions',
            header: '',
            render: (r) =>
              r.status !== 'ARCHIVED' ? (
                <button
                  type="button"
                  onClick={async () => {
                    await nesaApi.archiveGaPolicy(r.id);
                    await load();
                  }}
                  className="text-[12px] font-semibold text-danger hover:underline"
                >
                  Archive
                </button>
              ) : (
                '—'
              ),
          },
        ]}
        rows={pageRows}
        rowKey={(r) => r.id}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={safeRows.length}
        onPageChange={setPage}
      />
    </ModulePage>
  );
}
