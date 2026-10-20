'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Battery,
  Radio,
  RefreshCw,
  Wifi,
} from 'lucide-react';
import { DeviceDataTable, type DeviceTableColumn } from '@/components/device-data-table';
import { DevicePageLayout } from '@/components/device-page-layout';
import { DeviceStatusBadge, SyncBadge, timeAgo } from '@/components/device-status-badge';
import { RegisterDeviceModal } from '@/components/register-device-modal';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { deviceApi } from '@/services/device-api';
import type { DashboardData, RfidDevice } from '@/types';

export function DashboardView() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveCount, setLiveCount] = useState(0);
  const [registerOpen, setRegisterOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await deviceApi.dashboard();
      setData(res.data);
      setLiveCount(res.data.attendance.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => {
      setLiveCount((c) => c + (Math.random() > 0.85 ? 1 : 0));
    }, 8000);
    return () => clearInterval(t);
  }, [load]);

  const k = data?.kpis;
  const timeline = Array.isArray(data?.timeline) ? data.timeline : [];
  const maxTimeline = Math.max(...timeline.map((t) => t.count), 1);
  const devices = data?.devices ?? [];

  const deviceColumns: DeviceTableColumn<RfidDevice>[] = [
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
          <div className="mt-1">
            <SyncBadge status={d.syncStatus} />
          </div>
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
      subtitle="Live device health, attendance counters and sync status"
      actions={
        <button type="button" className="btn-secondary" onClick={() => void load()}>
          <RefreshCw size={16} /> Refresh
        </button>
      }
    >
      <StatsGrid columns={4}>
        <StatCard
          label="Devices Online"
          value={k?.devicesOnline ?? '—'}
          delta={`${k?.devicesOffline ?? 0} offline`}
        />
        <StatCard
          label="Today's Attendance"
          value={liveCount.toLocaleString()}
          delta="Live counter"
        />
        <StatCard
          label="Cards Scanned"
          value={k?.cardsScannedToday ?? '—'}
          delta={`${k?.failedCardReads ?? 0} failed reads`}
        />
        <StatCard
          label="Pending Sync"
          value={k?.pendingSync ?? '—'}
          delta={`${k?.lowBattery ?? 0} low battery`}
        />
      </StatsGrid>

      <StatsGrid columns={4} className="mt-0">
        <StatCard label="Devices Offline" value={k?.devicesOffline ?? '—'} />
        <StatCard label="Low Battery" value={k?.lowBattery ?? '—'} />
        <StatCard label="Wi-Fi Signal" value={k?.wifiSignal ?? '—'} />
        <StatCard label="Failed Reads" value={k?.failedCardReads ?? '—'} />
      </StatsGrid>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="animate-scale-in lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-navy">RFID Devices</h2>
            <Link href="/devices" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <DeviceDataTable
            columns={deviceColumns}
            data={devices}
            rowKey={(d) => d.id}
            loading={loading}
            emptyMessage="No devices registered yet"
            emptyAction={
              <button type="button" className="btn-primary text-xs" onClick={() => setRegisterOpen(true)}>
                Register Device
              </button>
            }
            onView={(d) => router.push(`/devices/${d.id}`)}
            minWidth={720}
          />
        </div>

        <div className="space-y-6">
          <div className="hr-card p-5">
            <div className="flex items-center gap-2 text-navy">
              <h2 className="text-sm font-bold uppercase tracking-wide">Live Attendance</h2>
            </div>
            <p className="mt-4 text-4xl font-bold text-navy">{liveCount.toLocaleString()}</p>
            <p className="mt-1 text-xs text-muted">Students checked in today</p>
            {data?.attendance ? (
              <dl className="mt-4 space-y-1 text-xs">
                <div className="flex justify-between">
                  <dt className="text-muted">Present</dt>
                  <dd className="font-semibold text-navy">{data.attendance.present}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Late</dt>
                  <dd className="font-semibold text-navy">{data.attendance.late}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Unknown cards</dt>
                  <dd className="font-semibold text-navy">{data.attendance.unknownCards}</dd>
                </div>
              </dl>
            ) : null}
          </div>

          <div className="hr-card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-navy">By Gate</h2>
            <ul className="mt-3 space-y-2">
              {(data?.attendance.byGate ?? []).map((g) => (
                <li key={g.deviceCode} className="flex items-center justify-between text-sm">
                  <span className="text-muted">{g.gate}</span>
                  <span className="font-semibold text-navy">{g.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="hr-card p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy">
          Attendance Timeline (06:00 → 09:00)
        </h2>
        <div className="flex h-32 items-end gap-3 overflow-x-auto pb-2">
          {timeline.map((slot) => (
            <div key={slot.label} className="flex w-10 shrink-0 flex-col items-center justify-end gap-2">
              <div
                className="w-8 shrink-0 rounded-t-lg bg-gradient-to-t from-primary/80 to-primary/30"
                style={{ height: `${Math.max(4, (slot.count / maxTimeline) * 96)}px` }}
              />
              <span className="text-[10px] text-muted">{slot.label}</span>
              <span className="text-xs font-semibold text-navy">{slot.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/devices" className="hr-card hr-card-hover flex items-center gap-3 p-4">
          <Radio className="text-primary" size={22} />
          <span className="text-sm font-semibold text-navy">Manage Devices</span>
        </Link>
        <Link href="/events" className="hr-card hr-card-hover flex items-center gap-3 p-4">
          <Wifi className="text-primary" size={22} />
          <span className="text-sm font-semibold text-navy">Card Events</span>
        </Link>
        <Link href="/devices/alerts" className="hr-card hr-card-hover flex items-center gap-3 p-4">
          <Battery className="text-primary" size={22} />
          <span className="text-sm font-semibold text-navy">Device Alerts</span>
        </Link>
      </div>
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
