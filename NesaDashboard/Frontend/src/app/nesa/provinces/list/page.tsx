'use client';

import { useEffect, useMemo, useState } from 'react';
import { ModulePage } from '@/components/ui/module-page';
import { KpiCard } from '@/components/ui/kpi-card';
import { NesaDataTable, StatusPill } from '@/components/ui/nesa-data-table';
import { nesaApi, asList } from '@/services/nesa-api';

type Row = { id: string; code: string; name: string; districtCount: number };

const PAGE_SIZE = 10;

export default function ProvincesListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await nesaApi.listProvinces();
        setRows(asList<Row>(res.data.data));
      } catch (err) {
        setRows([]);
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Failed to load provinces'
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const safeRows = Array.isArray(rows) ? rows : [];
  const pageRows = useMemo(
    () => safeRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [safeRows, page]
  );

  return (
    <ModulePage title="Provinces" subtitle="Territory data from NESA backend">
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Provinces" value={safeRows.length} />
        <KpiCard
          label="Districts (sum)"
          value={safeRows.reduce((a, r) => a + (r.districtCount ?? 0), 0)}
        />
        <KpiCard label="Data source" value="API" />
      </div>
      {error ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}
      <NesaDataTable
        title="Province list"
        columns={[
          { key: 'name', header: 'Province', render: (r) => <span className="font-semibold">{r.name}</span> },
          { key: 'code', header: 'Code', render: (r) => r.code },
          {
            key: 'districts',
            header: 'Districts',
            render: (r) => r.districtCount,
          },
          {
            key: 'status',
            header: 'Status',
            render: () => <StatusPill status="ACTIVE" />,
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
