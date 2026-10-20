'use client';

import type { DeviceStatus } from '@/types';

const config: Record<DeviceStatus, { dot: string; label: string }> = {
  ONLINE: { dot: 'bg-emerald-500', label: 'Online' },
  OFFLINE: { dot: 'bg-red-500', label: 'Offline' },
  WARNING: { dot: 'bg-amber-500', label: 'Warning' },
  MAINTENANCE: { dot: 'bg-slate-400', label: 'Maintenance' },
};

export function DeviceStatusBadge({ status }: { status: DeviceStatus | string }) {
  const c = config[status as DeviceStatus] ?? config.OFFLINE;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-navy">
      <span className={`h-2 w-2 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

export function SyncBadge({ status }: { status: string }) {
  const tone =
    status === 'SYNCED' ? 'text-emerald-700 bg-emerald-50' : status === 'PENDING' ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50';
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${tone}`}>{status}</span>;
}

export function timeAgo(iso?: string | null) {
  if (!iso) return '—';
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec} sec ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  return `${hr} hr ago`;
}
