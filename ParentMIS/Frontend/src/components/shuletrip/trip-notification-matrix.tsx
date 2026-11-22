'use client';

import type { SchoolTrip } from '@/types/shuletrip';
import { SHULETRIP_NOTIFICATION_MATRIX, channelLabel } from '@/lib/shuletrip-notifications';
import { cn } from '@/lib/utils';

export function TripNotificationMatrix({ trip }: { trip?: SchoolTrip }) {
  const smsNote = trip?.notifications?.smsEnabled === false ? 'SMS alerts are off for this child.' : 'SMS sent for urgent events when enabled in your profile.';

  return (
    <div className="overflow-hidden rounded-[22px] border border-[var(--yo-line)] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="bg-[var(--yo-navy)] text-[11px] font-bold uppercase tracking-wide text-white">
              <th className="px-4 py-3">Event</th>
              <th className="px-3 py-3 text-center">In-app</th>
              <th className="px-3 py-3 text-center">Web push</th>
              <th className="px-3 py-3 text-center">SMS</th>
            </tr>
          </thead>
          <tbody>
            {SHULETRIP_NOTIFICATION_MATRIX.map((row, i) => (
              <tr key={row.event} className={cn(i % 2 === 0 ? 'bg-white' : 'bg-[var(--yo-bg)]/60')}>
                <td className="px-4 py-3 font-semibold text-[var(--yo-navy)]">{row.event}</td>
                <td className="px-3 py-3 text-center font-bold text-emerald-700">{channelLabel(row.inApp)}</td>
                <td className="px-3 py-3 text-center font-bold text-emerald-700">{channelLabel(row.push)}</td>
                <td className="px-3 py-3 text-center font-semibold text-[var(--yo-navy)]">{channelLabel(row.sms)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-[var(--yo-line)] px-4 py-3 text-xs text-[var(--yo-muted)]">{smsNote}</p>
    </div>
  );
}
