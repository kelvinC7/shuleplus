'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, MapPin, Radio, School } from 'lucide-react';
import {
  fetchRfidMap,
  fetchRfidOverview,
} from '@/lib/device-rfid-api';

export function RfidNetworkOverviewView() {
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof fetchRfidOverview>> | null>(null);
  const [map, setMap] = useState<Awaited<ReturnType<typeof fetchRfidMap>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [o, m] = await Promise.all([fetchRfidOverview(), fetchRfidMap()]);
      setOverview(o);
      setMap(m);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load RFID network data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted">
        <Loader2 className="size-4 animate-spin" /> Loading RFID network…
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        {error ?? 'No data'}
        <button type="button" className="ml-3 font-semibold underline" onClick={() => void load()}>Retry</button>
      </div>
    );
  }

  const k = overview.kpis;
  const n = overview.network;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">RFID Network</h1>
        <p className="mt-1 text-sm text-muted">Global view of schools, gate readers and live attendance</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5">
        {[
          { label: 'Total Schools', value: k.totalSchools },
          { label: 'Total Devices', value: k.totalDevices },
          { label: 'Online', value: k.onlineDevices, tone: 'text-emerald-600' },
          { label: 'Offline', value: k.offlineDevices, tone: 'text-red-600' },
          { label: 'With Alerts', value: k.devicesWithAlerts, tone: 'text-amber-600' },
          { label: 'Checked In Today', value: k.studentsCheckedInToday },
          { label: 'Card Events Today', value: k.cardEventsToday },
          { label: 'Failed Events', value: k.failedEvents, tone: 'text-red-600' },
          { label: 'Pending Sync', value: k.pendingSynchronizations, tone: 'text-amber-600' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{item.label}</p>
            <p className={`mt-1 text-2xl font-bold ${item.tone ?? 'text-navy'}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
        <p className="text-sm font-semibold text-emerald-900">RFID Network Status</p>
        <p className="mt-2 text-lg">
          🟢 {n.online.toLocaleString()} Online · 🔴 {n.offline} Offline · 🟡 {n.withAlerts} With Alerts
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><MapPin size={18} className="text-primary" /><h2 className="font-bold text-navy">Rwanda — Schools by Region</h2></div>
          <ul className="space-y-3">
            {map.map((r: { province: string; schools: number; devices: number; online: number; offline: number }) => (
              <li key={r.province} className="rounded-xl border border-border/60 p-3">
                <p className="font-semibold text-navy">📍 {r.province}</p>
                <p className="mt-1 text-xs text-muted">{r.schools} schools · {r.devices} readers · {r.online} online · {r.offline} offline</p>
                <Link href={`/super-admin/rfid-network/schools?province=${encodeURIComponent(r.province)}`} className="mt-2 inline-block text-xs font-semibold text-primary">View schools →</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-navy">Quick Links</h2>
          <div className="grid gap-2">
            {[
              { href: '/super-admin/rfid-network/schools', label: 'Schools', icon: School },
              { href: '/super-admin/rfid-network/devices', label: 'Device Fleet', icon: Radio },
              { href: '/super-admin/rfid-network/events', label: 'Live Events', icon: Radio },
              { href: '/super-admin/rfid-network/firmware', label: 'Firmware', icon: Radio },
              { href: '/super-admin/rfid-network/profiles', label: 'Configuration Profiles', icon: Radio },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-navy hover:bg-slate-50">
                <l.icon size={16} className="text-primary" /> {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
