'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ModulePage } from '@/components/ui/module-page';
import { KpiCard } from '@/components/ui/kpi-card';
import { NesaDataTable, StatusPill } from '@/components/ui/nesa-data-table';
import { nesaApi, asList } from '@/services/nesa-api';
import type { FeePolicyRecord } from '@/lib/policy-constants';

const PAGE_SIZE = 10;

export default function FeePolicyPage() {
  const [rows, setRows] = useState<FeePolicyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  async function load() {
    setLoading(true);
    try {
      const params = statusFilter ? { status: statusFilter } : undefined;
      const res = await nesaApi.listFeePolicies(params);
      setRows(asList<FeePolicyRecord>(res.data.data));
      setError('');
    } catch (err) {
      setRows([]);
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to load fee policies'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [statusFilter]);

  async function archive(id: string) {
    await nesaApi.archiveFeePolicy(id);
    await load();
  }

  const safeRows = Array.isArray(rows) ? rows : [];
  const pageRows = useMemo(
    () => safeRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [safeRows, page]
  );

  return (
    <ModulePage
      title="Fee Policy Dashboard"
      subtitle="National tuition limits for public schools."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            href="/nesa/fee-policy/simulate"
            className="rounded-lg border border-navy/10 px-4 py-2 text-[13px] font-semibold text-navy"
          >
            Simulate
          </Link>
          <Link
            href="/nesa/general-assembly-policies"
            className="rounded-lg border border-navy/10 px-4 py-2 text-[13px] font-semibold text-navy"
          >
            General Assembly
          </Link>
          <Link
            href="/nesa/fee-policy/create"
            className="rounded-lg bg-navy px-4 py-2 text-[13px] font-semibold text-white"
          >
            Create policy
          </Link>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Policies" value={safeRows.length} />
        <KpiCard
          label="Active"
          value={safeRows.filter((r) => r.status === 'ACTIVE').length}
        />
        <KpiCard
          label="Archived"
          value={safeRows.filter((r) => r.status === 'ARCHIVED').length}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {['', 'ACTIVE', 'DRAFT', 'ARCHIVED'].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => {
              setPage(1);
              setStatusFilter(s);
            }}
            className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold ${
              statusFilter === s
                ? 'border-navy bg-navy text-white'
                : 'border-navy/10 bg-white text-navy/70'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <NesaDataTable
        title="Tuition policy catalog"
        columns={[
          {
            key: 'scope',
            header: 'Policy',
            render: (r) => (
              <div>
                <p className="font-semibold text-navy">
                  {r.educationLevel} · {r.studentType === 'DAY' ? 'Day' : 'Boarding'}
                </p>
                <p className="text-[11px] text-navy/45">
                  {r.academicYear} · Term {r.term}
                </p>
              </div>
            ),
          },
          {
            key: 'ownership',
            header: 'Ownership',
            render: (r) =>
              (r.ownerships ?? [])
                .map((o) => o.replaceAll('_', ' '))
                .join(', ') || '—',
          },
          {
            key: 'classes',
            header: 'Classes',
            render: (r) => (r.applyToClasses ?? []).join(', ') || '—',
          },
          {
            key: 'cap',
            header: 'Max tuition',
            render: (r) => `${Number(r.maxTuitionRwf).toLocaleString()} RWF`,
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
                  onClick={() => void archive(r.id)}
                  className="text-[12px] font-semibold text-danger hover:underline"
                >
                  Archive
                </button>
              ) : (
                <span className="text-[12px] text-navy/35">—</span>
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
