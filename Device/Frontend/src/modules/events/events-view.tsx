'use client';

import { useCallback, useEffect, useState } from 'react';
import { DeviceDataTable, type DeviceTableColumn } from '@/components/device-data-table';
import { DevicePageLayout } from '@/components/device-page-layout';
import { SyncBadge } from '@/components/device-status-badge';
import { deviceApi } from '@/services/device-api';
import type { CardEvent } from '@/types';

export function EventsView() {
  const [rows, setRows] = useState<CardEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 30;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await deviceApi.events({ page, limit: pageSize });
      setRows(data.data ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: DeviceTableColumn<CardEvent>[] = [
    {
      key: 'time',
      header: 'Time',
      render: (e) => (
        <span className="font-mono text-xs">{new Date(e.timestamp).toLocaleString()}</span>
      ),
    },
    {
      key: 'student',
      header: 'Student',
      render: (e) => e.studentName ?? '—',
    },
    {
      key: 'card',
      header: 'Card',
      hideOnMobile: true,
      render: (e) => <span className="font-mono text-xs">{e.cardUid}</span>,
    },
    {
      key: 'event',
      header: 'Event',
      render: (e) => e.eventType.replace(/_/g, ' '),
    },
    {
      key: 'location',
      header: 'Location',
      hideOnMobile: true,
      render: (e) => e.readerLocation ?? e.device?.location ?? '—',
    },
    {
      key: 'sync',
      header: 'Sync',
      hideOnMobile: true,
      render: (e) =>
        e.syncStatus === 'SYNCED' ? (
          <span className="text-emerald-600">✓</span>
        ) : (
          <SyncBadge status={e.syncStatus} />
        ),
    },
  ];

  return (
    <DevicePageLayout subtitle="Every scan from your RFID readers with sync status">
      <DeviceDataTable
        columns={columns}
        data={rows}
        rowKey={(e) => e.id}
        loading={loading}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        emptyMessage="No card events yet"
        minWidth={900}
      />
    </DevicePageLayout>
  );
}
