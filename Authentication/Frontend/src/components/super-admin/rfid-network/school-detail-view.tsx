'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { fetchRfidSchoolDevices } from '@/lib/device-rfid-api';

export function RfidSchoolDetailView({ orgId }: { orgId: string }) {
  const [data, setData] = useState<{ tenant: Record<string, unknown>; devices: Array<Record<string, unknown>> } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchRfidSchoolDevices(orgId));
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <div className="flex gap-2 py-12 text-sm text-muted"><Loader2 className="size-4 animate-spin" /> Loading…</div>;
  if (!data) return <p className="text-sm text-muted">School not found</p>;

  const online = data.devices.filter((d) => d.status === 'ONLINE').length;
  const offline = data.devices.filter((d) => d.status === 'OFFLINE').length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/super-admin/rfid-network/schools" className="text-xs font-semibold text-primary">← Schools</Link>
        <h1 className="mt-2 text-2xl font-bold text-navy">{String(data.tenant.organizationName)}</h1>
        <p className="text-sm text-muted">{data.devices.length} RFID devices · {online} online · {offline} offline</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b bg-slate-50 text-xs uppercase text-muted"><th className="px-4 py-3">Device</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Today</th></tr></thead>
          <tbody>
            {data.devices.map((d) => (
              <tr key={String(d.id)} className="border-b border-border/60">
                <td className="px-4 py-3 font-mono text-xs">{String(d.deviceCode)}</td>
                <td className="px-4 py-3">{String(d.location)}</td>
                <td className="px-4 py-3">{String(d.status)}</td>
                <td className="px-4 py-3">{String(d.todayScans)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
