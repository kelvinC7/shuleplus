'use client';

import { ShuleTripShell } from '@/components/shuletrip/shuletrip-shell';
import { TripStatsRow } from '@/components/shuletrip/trip-stats-row';
import { TripCard } from '@/components/shuletrip/trip-card';
import { isUpcomingTrip, tripConsentState } from '@/lib/shuletrip-utils';

export default function ShuleTripOverviewPage() {
  return (
    <ShuleTripShell title="Trip command center">
      {({ trips }) => {
        const spotlight =
          trips.find((t) => tripConsentState(t) === 'awaiting' && isUpcomingTrip(t)) ??
          trips.find((t) => isUpcomingTrip(t)) ??
          trips[0];
        const upcoming = trips.filter((t) => isUpcomingTrip(t)).slice(0, 3);
        return (
          <div className="space-y-6">
            <TripStatsRow trips={trips} />
            {spotlight ? (
              <div>
                <h2 className="mb-3 text-base font-bold text-[var(--yo-navy)]">Needs your attention</h2>
                <TripCard trip={spotlight} />
              </div>
            ) : null}
            <div>
              <h2 className="mb-3 text-base font-bold text-navy">All trips</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {trips.map((t) => (
                  <TripCard key={`${t.id}:${t.studentId}`} trip={t} compact />
                ))}
              </div>
            </div>
          </div>
        );
      }}
    </ShuleTripShell>
  );
}
