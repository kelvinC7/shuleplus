'use client';

import { ShuleTripShell } from '@/components/shuletrip/shuletrip-shell';
import { TripCard } from '@/components/shuletrip/trip-card';
import { isUpcomingTrip, tripConsentState } from '@/lib/shuletrip-utils';

export default function ShuleTripHistoryPage() {
  return (
    <ShuleTripShell title="Trip history" description="Completed journeys and approved past trips.">
      {({ trips }) => {
        const list = trips.filter(
          (t) => tripConsentState(t) === 'approved' && !isUpcomingTrip(t)
        );
        const fallback = trips.filter((t) => tripConsentState(t) === 'approved');
        const show = list.length ? list : fallback;
        return (
          <div className="grid gap-4 md:grid-cols-2">
            {show.map((t) => (
              <TripCard key={t.id} trip={t} compact />
            ))}
          </div>
        );
      }}
    </ShuleTripShell>
  );
}
