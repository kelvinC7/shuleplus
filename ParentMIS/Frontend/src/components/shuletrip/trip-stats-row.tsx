'use client';

import type { SchoolTrip } from '@/types/shuletrip';
import { tripStats } from '@/lib/shuletrip-utils';

export function TripStatsRow({ trips }: { trips: SchoolTrip[] }) {
  const s = tripStats(trips);
  const tiles = [
    { label: 'Total trips', value: s.total },
    { label: 'Upcoming', value: s.upcoming },
    { label: 'Completed', value: s.completed },
    { label: 'Awaiting consent', value: s.awaiting },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-2xl border border-border/80 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold tabular-nums text-navy">{t.value}</p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{t.label}</p>
        </div>
      ))}
    </div>
  );
}
