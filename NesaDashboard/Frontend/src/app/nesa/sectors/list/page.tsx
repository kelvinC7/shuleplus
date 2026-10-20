'use client';

import { useEffect, useMemo, useState } from 'react';
import { ModulePage } from '@/components/ui/module-page';
import { KpiCard } from '@/components/ui/kpi-card';
import { NesaDataTable, StatusPill } from '@/components/ui/nesa-data-table';
import { nesaApi, asList } from '@/services/nesa-api';

type Row = { id: string; districtId: string; code: string; name: string };
const PAGE_SIZE = 10;

export default function SectorsListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await nesaApi.listSectors();
        setRows(asList<Row>(res.data.data));
      } catch (err) {
        setRows([]);
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Failed to load sectors'
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
    <ModulePage title="Sectors" subtitle="Live sectors from NESA backend">
      <KpiCard label="Sectors" value={safeRows.length} />
      {error ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}
      <NesaDataTable
        title="Sector list"
        columns={[
          { key: 'name', header: 'Sector', render: (r) => <span className="font-semibold">{r.name}</span> },
          { key: 'code', header: 'Code', render: (r) => r.code },
          { key: 'status', header: 'Status', render: () => <StatusPill status="ACTIVE" /> },
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
