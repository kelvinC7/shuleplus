'use client';

import { useCallback, useEffect, useState } from 'react';
import { DeviceDataTable, type DeviceTableColumn } from '@/components/device-data-table';
import { DevicePageLayout } from '@/components/device-page-layout';
import { deviceApi } from '@/services/device-api';
import type { DeviceAlert } from '@/types';

function severityClass(severity: string) {
  if (severity === 'CRITICAL') return 'text-red-700 bg-red-50 border-red-200';
  if (severity === 'WARNING') return 'text-amber-800 bg-amber-50 border-amber-200';
  return 'text-slate-700 bg-slate-50 border-border';
}

export function AlertsView() {
  const [rows, setRows] = useState<DeviceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await deviceApi.alerts({ limit: 30 });
      setRows(data.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: DeviceTableColumn<DeviceAlert>[] = [
    {
      key: 'severity',
      header: 'Severity',
      render: (a) => (
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${severityClass(a.severity)}`}>
          {a.severity}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Alert',
      render: (a) => (
        <div>
          <p className="font-semibold text-navy">{a.title}</p>
          <p className="mt-0.5 text-xs text-muted">{a.message}</p>
        </div>
      ),
    },
    {
      key: 'device',
      header: 'Device',
      hideOnMobile: true,
      render: (a) => (a.device ? <span className="font-mono text-xs">{a.device.deviceCode}</span> : '—'),
    },
    {
      key: 'time',
      header: 'When',
      hideOnMobile: true,
      render: (a) => (
        <span className="text-xs text-muted">
          {a.createdAt ? new Date(a.createdAt).toLocaleString() : '—'}
        </span>
      ),
    },
  ];

  return (
    <DevicePageLayout subtitle="Notifications requiring attention">
      <DeviceDataTable
        columns={columns}
        data={rows}
        rowKey={(a) => a.id}
        loading={loading}
        emptyMessage="No active alerts"
        minWidth={640}
      />
    </DevicePageLayout>
  );
}
