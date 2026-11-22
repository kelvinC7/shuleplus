'use client';

import { useMemo, useState } from 'react';
import { TransportPortalShell } from '@/components/transport/transport-portal-shell';
import type { TransportTimelineEvent } from '@/types/parent-transport';

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function AttendanceList({ history }: { history: TransportTimelineEvent[] }) {
  const [phase, setPhase] = useState<'all' | 'morning' | 'afternoon'>('all');
  const rows = useMemo(() => {
    if (phase === 'morning') return history.filter((e) => e.phase === 'morning');
    if (phase === 'afternoon') return history.filter((e) => e.phase === 'afternoon');
    return history;
  }, [history, phase]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(['all', 'morning', 'afternoon'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPhase(p)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
              phase === p ? 'bg-navy text-primary' : 'bg-white text-muted ring-1 ring-slate-200'
            }`}
          >
            {p === 'all' ? 'All journeys' : p}
          </button>
        ))}
      </div>
      <div className="hr-card divide-y divide-slate-100">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-muted">No attendance records yet.</p>
        ) : (
          rows.map((ev) => (
            <div key={ev.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-navy">{ev.label}</p>
                <p className="text-xs text-muted">{ev.detail}</p>
                <p className="text-xs text-muted">{ev.stopName ?? 'Stop not recorded'}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm tabular-nums text-navy">{fmt(ev.scannedAt)}</p>
                <p className="text-xs text-muted">
                  {ev.method} · {ev.confirmed ? 'Confirmed' : 'Exception / pending review'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function TransportAttendancePage() {
  return (
    <TransportPortalShell title="Attendance history">
      {({ portal }) => <AttendanceList history={portal.history} />}
    </TransportPortalShell>
  );
}
