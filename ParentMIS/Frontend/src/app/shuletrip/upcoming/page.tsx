'use client';

import { ShuleTripShell } from '@/components/shuletrip/shuletrip-shell';
import { TripCard } from '@/components/shuletrip/trip-card';
import { isUpcomingTrip, tripConsentState } from '@/lib/shuletrip-utils';

export default function ShuleTripUpcomingPage() {
  return (
    <ShuleTripShell title="Upcoming trips" description="Every future school trip for your child.">
      {({ trips }) => {
        const list = trips.filter((t) => isUpcomingTrip(t) && tripConsentState(t) !== 'declined');
        return (
          <div className="grid gap-4 md:grid-cols-2">
            {list.map((t) => (
              <TripCard key={t.id} trip={t} />
            ))}
          </div>
        );
      }}
    </ShuleTripShell>
  );
}
