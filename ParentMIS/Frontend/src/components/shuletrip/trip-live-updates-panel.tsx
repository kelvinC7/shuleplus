'use client';

import type { SchoolTrip } from '@/types/shuletrip';
import { Bell } from 'lucide-react';

export function TripLiveUpdatesPanel({ trip }: { trip: SchoolTrip }) {
  const updates = trip.liveUpdates ?? [];

  if (!updates.length) {
    return (
      <p className="text-sm text-[var(--yo-muted)]">
        Live updates will appear here during the trip (boarding, departure, arrival, return).
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {updates.map((u) => (
        <li key={u.id} className="hr-card rounded-2xl px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-[var(--yo-muted)]">{u.at}</p>
              <p className="font-extrabold text-[var(--yo-navy)]">{u.title}</p>
              {u.detail ? <p className="mt-0.5 text-sm text-[var(--yo-muted)]">{u.detail}</p> : null}
            </div>
            <Bell className="size-4 shrink-0 text-[var(--yo-amber)]" />
          </div>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--yo-muted)]">
            Delivered · In-app {u.delivered.inApp ? '✓' : '-'} · Push {u.delivered.push ? '✓' : '-'} · SMS{' '}
            {u.delivered.sms ? '✓' : '-'}
          </p>
        </li>
      ))}
    </ul>
  );
}
