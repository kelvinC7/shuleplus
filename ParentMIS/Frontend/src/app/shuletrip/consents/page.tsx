'use client';

import Link from 'next/link';
import { ShuleTripShell } from '@/components/shuletrip/shuletrip-shell';
import { tripConsentState, statusBadge, destinationFromPlace } from '@/lib/shuletrip-utils';
import { cn } from '@/lib/utils';

export default function ShuleTripConsentsPage() {
  return (
    <ShuleTripShell title="Consent center" description="Digital approvals - secure and recorded for the school.">
      {({ trips }) => (
        <ul className="space-y-3">
          {trips.map((trip) => {
            const state = tripConsentState(trip);
            const badge = statusBadge(trip);
            return (
              <li key={trip.id} className="hr-card rounded-[20px] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-extrabold text-[var(--yo-navy)]">{trip.title}</p>
                    <p className="text-sm text-[var(--yo-muted)]">{destinationFromPlace(trip.place)} · {trip.date}</p>
                    {trip.consent?.by ? (
                      <p className="mt-1 text-xs font-semibold text-[var(--yo-muted)]">
                        {state === 'approved' ? 'Approved' : 'Declined'} by {trip.consent.by} · {trip.consent.at}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase',
                      state === 'awaiting' ? 'bg-[var(--yo-amber)]/30 text-[#7a4d00]' : 'bg-[var(--yo-bg)] text-[var(--yo-navy)]'
                    )}
                  >
                    {badge.label}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/shuletrip/${trip.id}`}
                    className="rounded-xl border border-[var(--yo-line)] px-3 py-2 text-xs font-bold text-[var(--yo-navy)]"
                  >
                    Review trip
                  </Link>
                  {state === 'awaiting' ? (
                    <Link
                      href={`/shuletrip/${trip.id}#consent`}
                      className="rounded-xl bg-[var(--yo-amber)] px-3 py-2 text-xs font-extrabold text-[var(--yo-navy)]"
                    >
                      Give consent
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ShuleTripShell>
  );
}
