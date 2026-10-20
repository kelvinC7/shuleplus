'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { DeviceDataTable, type DeviceTableColumn } from '@/components/device-data-table';
import { DevicePageLayout } from '@/components/device-page-layout';
import { RegisterDeviceModal } from '@/components/register-device-modal';
import { DeviceStatusBadge, timeAgo } from '@/components/device-status-badge';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { useAuth } from '@/contexts/auth-context';
import { deviceApi } from '@/services/device-api';
import type { RfidDevice } from '@/types';

interface DevicesViewProps {
  statusFilter?: string;
  title?: string;
  subtitle?: string;
}

export function DevicesView({
  statusFilter,
  title = 'RFID Devices',
  subtitle = 'Gate readers registered for your school',
}: DevicesViewProps) {
  const router = useRouter();
  const { ready, authorized } = useAuth();
  const [rows, setRows] = useState<RfidDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [registerOpen, setRegisterOpen] = useState(false);
  const pageSize = 20;

  const load = useCallback(async () => {
    if (!ready || !authorized) {
      if (ready && !authorized) setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data } = await deviceApi.devices({ page, limit: pageSize, status: statusFilter });
      setRows(data.data ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [authorized, page, ready, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const subtitleText = useMemo(() => {
    if (statusFilter === 'ONLINE') return 'Readers currently connected and syncing';
    if (statusFilter === 'OFFLINE') return 'Readers that lost connection';
    return subtitle;
  }, [statusFilter, subtitle]);

  const columns: DeviceTableColumn<RfidDevice>[] = [
    {
      key: 'device',
      header: 'Device',
      render: (d) => (
        <div>
          <p className="font-mono text-xs font-semibold text-navy">{d.deviceCode}</p>
          <p className="text-xs text-muted">{d.deviceName}</p>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      hideOnMobile: true,
      render: (d) => d.location,
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => (
        <div>
          <DeviceStatusBadge status={d.status} />
          {d.status === 'OFFLINE' && d.lastSeenAt ? (
            <p className="mt-1 text-[10px] text-muted">Last seen {timeAgo(d.lastSeenAt)}</p>
          ) : d.status === 'ONLINE' ? (
            <p className="mt-1 text-[10px] text-emerald-700">SYNCED · NORMAL</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'battery',
      header: 'Battery',
      hideOnMobile: true,
      render: (d) => (d.batteryLevel != null ? `${d.batteryLevel}%` : '—'),
    },
    {
      key: 'wifi',
      header: 'Wi-Fi',
      hideOnMobile: true,
      render: (d) => d.wifiQuality ?? '—',
    },
    {
      key: 'today',
      header: 'Today',
      render: (d) => d.todayScans,
    },
    {
      key: 'sync',
      header: 'Last Sync',
      hideOnMobile: true,
      render: (d) => <span className="text-xs text-muted">{timeAgo(d.lastSyncAt)}</span>,
    },
  ];

  return (
    <DevicePageLayout
      subtitle={subtitleText}
      actions={
        <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={() => setRegisterOpen(true)}>
          <Plus size={16} /> Register Device
        </button>
      }
    >
      <StatsGrid columns={4}>
        <StatCard label="Total Devices" value={total} delta={`Page ${page} of ${totalPages}`} />
      </StatsGrid>

      <DeviceDataTable
        columns={columns}
        data={rows}
        rowKey={(d) => d.id}
        loading={loading}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        emptyMessage="No devices found"
        emptyAction={
          <button type="button" className="btn-primary text-xs" onClick={() => setRegisterOpen(true)}>
            Register Device
          </button>
        }
        onView={(d) => router.push(`/devices/${d.id}`)}
        minWidth={960}
      />
      <RegisterDeviceModal
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        onSuccess={(id) => {
          void load();
          router.push(`/devices/${id}`);
        }}
      />
    </DevicePageLayout>
  );
}
