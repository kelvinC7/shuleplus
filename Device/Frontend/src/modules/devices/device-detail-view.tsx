'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  RefreshCw,
  RotateCcw,
  Settings,
  Shield,
  Terminal,
} from 'lucide-react';
import { DevicePageLayout } from '@/components/device-page-layout';
import { DeviceStatusBadge, SyncBadge, timeAgo } from '@/components/device-status-badge';
import { deviceApi } from '@/services/device-api';
import type { DeviceLog, OfflineStatus, RfidDevice } from '@/types';

function ProgressBar({ value, tone = 'primary' }: { value: number; tone?: 'primary' | 'warning' | 'danger' }) {
  const color = tone === 'danger' ? 'bg-red-500' : tone === 'warning' ? 'bg-amber-500' : 'bg-primary';
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

export function DeviceDetailView({ deviceId }: { deviceId: string }) {
  const router = useRouter();
  const [device, setDevice] = useState<RfidDevice | null>(null);
  const [logs, setLogs] = useState<DeviceLog[]>([]);
  const [offline, setOffline] = useState<OfflineStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, lRes, oRes] = await Promise.all([
        deviceApi.device(deviceId),
        deviceApi.logs(deviceId, { limit: 8 }),
        deviceApi.offlineStatus(),
      ]);
      setDevice(dRes.data.data);
      setLogs(lRes.data.data ?? []);
      setOffline(oRes.data.data);
    } catch {
      router.push('/devices');
    } finally {
      setLoading(false);
    }
  }, [deviceId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function cmd(command: string, confirmed = false) {
    await deviceApi.sendCommand(deviceId, { command, confirmed });
    await load();
  }

  if (loading || !device) {
    return <div className="p-8 text-sm text-muted">Loading device…</div>;
  }

  const storagePct = device.storageUsedPct ?? 0;
  const batteryTone = (device.batteryLevel ?? 100) <= 20 ? 'danger' : (device.batteryLevel ?? 100) <= 40 ? 'warning' : 'primary';

  return (
    <DevicePageLayout
      title={`${device.deviceCode} — ${device.location}`}
      subtitle={
        device.status === 'ONLINE'
          ? `Online · Last seen ${timeAgo(device.lastSeenAt)}`
          : `Offline · Last seen ${timeAgo(device.lastSeenAt)}`
      }
      actions={
        <>
          <button type="button" className="btn-secondary" onClick={() => void cmd('SYNC_NOW')}>
            <RefreshCw size={16} /> Sync Now
          </button>
          <button type="button" className="btn-secondary" onClick={() => void cmd('RESTART')}>
            <RotateCcw size={16} /> Restart
          </button>
          <Link href="/configuration" className="btn-secondary inline-flex items-center gap-2">
            <Settings size={16} /> Configure
          </Link>
          <Link href="/commands" className="btn-secondary inline-flex items-center gap-2">
            <Terminal size={16} /> Commands
          </Link>
          <button type="button" className="btn-secondary" onClick={() => void cmd('LOCK_DEVICE')}>
            <Shield size={16} /> Lock Device
          </button>
          <Link href={`/logs?device=${deviceId}`} className="btn-primary inline-flex items-center gap-2">
            View Logs
          </Link>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <DeviceStatusBadge status={device.status} />
        <SyncBadge status={device.syncStatus} />
        {device.clockSynced === false ? (
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">Clock out of sync</span>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="hr-card space-y-4 p-5">
          <h2 className="font-bold text-navy">Battery</h2>
          <p className="text-3xl font-bold">{device.batteryLevel ?? '—'}%</p>
          <ProgressBar value={device.batteryLevel ?? 0} tone={batteryTone} />
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div><dt className="text-muted">Status</dt><dd>{(device.batteryLevel ?? 0) > 40 ? 'Good' : 'Low'}</dd></div>
            <div><dt className="text-muted">Charging</dt><dd>{device.batteryCharging ? 'Yes' : 'No'}</dd></div>
            <div><dt className="text-muted">Voltage</dt><dd>{device.batteryVoltage ?? '—'} V</dd></div>
            <div><dt className="text-muted">Last update</dt><dd>{timeAgo(device.batteryUpdatedAt)}</dd></div>
          </dl>
        </div>

        <div className="hr-card space-y-4 p-5">
          <h2 className="font-bold text-navy">Wi-Fi</h2>
          <p className="text-2xl font-bold">{device.wifiQuality ?? '—'}</p>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div><dt className="text-muted">SSID</dt><dd>{device.wifiSsid ?? '—'}</dd></div>
            <div><dt className="text-muted">Signal</dt><dd>{device.wifiSignalDbm ? `${device.wifiSignalDbm} dBm` : '—'}</dd></div>
            <div><dt className="text-muted">IP Address</dt><dd>{device.ipAddress ?? '—'}</dd></div>
            <div><dt className="text-muted">Connection</dt><dd>{device.serverConnected ? 'Connected' : 'Disconnected'}</dd></div>
          </dl>
        </div>

        <div className="hr-card space-y-4 p-5">
          <h2 className="font-bold text-navy">Server Connection</h2>
          <p className={`text-lg font-bold ${device.serverConnected ? 'text-emerald-600' : 'text-red-600'}`}>
            {device.serverConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </p>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div><dt className="text-muted">Last heartbeat</dt><dd>{timeAgo(device.lastHeartbeatAt)}</dd></div>
            <div><dt className="text-muted">Last sync</dt><dd>{timeAgo(device.lastSyncAt)}</dd></div>
            <div><dt className="text-muted">Pending events</dt><dd>{device.pendingEvents ?? 0}</dd></div>
            <div><dt className="text-muted">Response time</dt><dd>{device.serverResponseMs ? `${device.serverResponseMs} ms` : '—'}</dd></div>
          </dl>
        </div>

        <div className="hr-card space-y-4 p-5">
          <h2 className="font-bold text-navy">Device Storage</h2>
          <p className="text-3xl font-bold">{storagePct}% used</p>
          <ProgressBar value={storagePct} tone={storagePct > 85 ? 'danger' : 'primary'} />
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div><dt className="text-muted">Total</dt><dd>{device.storageTotalMb ?? '—'} MB</dd></div>
            <div><dt className="text-muted">Used</dt><dd>{device.storageUsedMb ?? '—'} MB</dd></div>
            <div><dt className="text-muted">Pending offline</dt><dd>{device.pendingOfflineEvents ?? 0} events</dd></div>
          </dl>
        </div>
      </div>

      <div className="hr-card p-5">
        <h2 className="mb-3 font-bold text-navy">Device Time</h2>
        <p className="text-sm">{device.deviceClock ? new Date(device.deviceClock).toLocaleString() : '—'}</p>
        <p className="mt-1 text-xs text-muted">Time zone: {device.timeZone ?? 'Africa/Kigali'} · {device.clockSynced ? '🟢 Synchronized' : '🔴 Out of sync'}</p>
      </div>

      {offline && device.pendingOfflineEvents ? (
        <div className="hr-card border-amber-200 bg-amber-50/50 p-5">
          <h2 className="font-bold text-navy">Offline Mode — {offline.pendingEvents} pending</h2>
          <p className="mt-2 text-sm text-muted">Oldest event: {offline.oldestEvent ? new Date(offline.oldestEvent).toLocaleTimeString() : '—'}</p>
          <p className="text-sm">Sync progress: {offline.syncProgress.synced} / {offline.syncProgress.total}</p>
          <button type="button" className="btn-primary mt-3" onClick={() => void cmd('SYNC_NOW')}>Sync Now</button>
        </div>
      ) : null}

      <div className="hr-card p-5">
        <h2 className="mb-3 font-bold text-navy">Recent Logs</h2>
        <ul className="space-y-1 font-mono text-xs">
          {logs.map((l) => (
            <li key={l.id} className="flex gap-3">
              <span className="text-muted">{new Date(l.createdAt).toLocaleTimeString()}</span>
              <span className={l.level === 'WARN' ? 'text-amber-700' : 'text-navy'}>{l.level}</span>
              <span>{l.message}</span>
            </li>
          ))}
        </ul>
        <Link href={`/logs?device=${deviceId}`} className="mt-3 inline-block text-xs font-semibold text-primary">View all logs</Link>
      </div>

      <Link href="/devices" className="text-sm font-semibold text-primary">← Back to devices</Link>
    </DevicePageLayout>
  );
}
