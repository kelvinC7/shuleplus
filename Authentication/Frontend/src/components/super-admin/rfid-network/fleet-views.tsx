'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { fetchRfidFleet, fetchRfidFirmware, fetchRfidGlobalEvents, fetchRfidProfiles } from '@/lib/device-rfid-api';

export function RfidFleetView() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchRfidFleet({ limit: 50 }).then((d) => {
      setRows(d.data ?? []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Device Fleet</h1>
      {selected.size > 0 ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
          Bulk actions for {selected.size} devices: Sync Time · Restart · Update Firmware · Push Config
        </div>
      ) : null}
      {loading ? <Loader2 className="size-4 animate-spin" /> : (
        <table className="w-full rounded-2xl border border-border bg-white text-sm shadow-sm">
          <thead><tr className="border-b bg-slate-50 text-xs uppercase text-muted"><th className="px-4 py-3" /><th className="px-4 py-3">Device</th><th className="px-4 py-3">School</th><th className="px-4 py-3">Status</th></tr></thead>
          <tbody>
            {rows.map((d) => (
              <tr key={String(d.id)} className="border-b">
                <td className="px-4 py-3"><input type="checkbox" checked={selected.has(String(d.id))} onChange={() => setSelected((p) => { const n = new Set(p); n.has(String(d.id)) ? n.delete(String(d.id)) : n.add(String(d.id)); return n; })} /></td>
                <td className="px-4 py-3 font-mono text-xs">{String(d.deviceCode)}</td>
                <td className="px-4 py-3">{(d.tenant as { organizationName?: string })?.organizationName ?? '—'}</td>
                <td className="px-4 py-3">{String(d.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function RfidEventsView() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { void fetchRfidGlobalEvents({ limit: 40 }).then((d) => setRows(d.data ?? [])); }, []);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Live Events</h1>
      <table className="w-full rounded-2xl border bg-white text-sm shadow-sm">
        <thead><tr className="border-b bg-slate-50 text-xs uppercase text-muted"><th className="px-4 py-3">Time</th><th className="px-4 py-3">Student</th><th className="px-4 py-3">Event</th><th className="px-4 py-3">Device</th></tr></thead>
        <tbody>
          {rows.map((e) => (
            <tr key={String(e.id)} className="border-b"><td className="px-4 py-3">{new Date(String(e.timestamp)).toLocaleTimeString()}</td><td className="px-4 py-3">{String(e.studentName ?? '—')}</td><td className="px-4 py-3">{String(e.eventType)}</td><td className="px-4 py-3">{(e.device as { deviceCode?: string })?.deviceCode}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RfidFirmwareView() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { void fetchRfidFirmware().then(setRows); }, []);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Firmware Management</h1>
      <table className="w-full rounded-2xl border bg-white text-sm shadow-sm">
        <thead><tr className="border-b bg-slate-50 text-xs uppercase text-muted"><th className="px-4 py-3">Version</th><th className="px-4 py-3">Devices</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Rollout</th></tr></thead>
        <tbody>
          {rows.map((f) => (
            <tr key={String(f.id)} className="border-b"><td className="px-4 py-3 font-mono">{String(f.version)}</td><td className="px-4 py-3">{String(f.deviceCount)}</td><td className="px-4 py-3">{String(f.status)}</td><td className="px-4 py-3">{String(f.rolloutPct)}%</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RfidProfilesView() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { void fetchRfidProfiles().then(setRows); }, []);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Configuration Profiles</h1>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((p) => (
          <div key={String(p.id)} className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="font-semibold text-navy">{String(p.name)}</p>
            <p className="mt-1 text-xs text-muted">{String(p.description ?? '')}</p>
            <p className="mt-2 text-xs">{String(p.deviceCount)} devices</p>
            <button type="button" className="mt-3 rounded-lg border px-3 py-1.5 text-xs font-semibold">Apply to selected fleet</button>
          </div>
        ))}
      </div>
    </div>
  );
}
