'use client';

import { ShuleTripShell } from '@/components/shuletrip/shuletrip-shell';
import { TripNotificationMatrix } from '@/components/shuletrip/trip-notification-matrix';

export default function ShuleTripNotificationsPage() {
  return (
    <ShuleTripShell
      title="Trip alerts & notifications"
      description="How ShuleTrip reaches you during consent, travel, emergencies, and gallery publishing."
    >
      {({ trips }) => (
        <div className="space-y-6">
          <TripNotificationMatrix trip={trips[0]} />
          <p className="text-sm text-[var(--yo-muted)]">
            Push notifications require an allowed browser or the yoShule parent app. SMS for cancelled trips and emergencies uses the phone number on your parent account.
          </p>
        </div>
      )}
    </ShuleTripShell>
  );
}
