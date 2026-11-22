import { env } from '../config/env';

export type ParentMisTripParticipant = {
  studentId: string;
  fullName: string;
  guardianPhone?: string | null;
  guardianEmail?: string | null;
  classLabel?: string | null;
};

export type PublishTripToParentMisInput = {
  organizationId: string;
  trip: {
    id: string;
    reference: string;
    title: string;
    purpose?: string | null;
    destination?: string | null;
    departAt?: Date | null;
    returnAt?: Date | null;
    tripLeaderName?: string | null;
    itinerary?: string | null;
    emergencyContact?: unknown;
  };
  participants: ParentMisTripParticipant[];
};

export async function publishTripToParentMis(input: PublishTripToParentMisInput): Promise<void> {
  const base = (env.PARENTMIS_API_URL ?? '').replace(/\/$/, '');
  if (!base) return;

  try {
    const res = await fetch(`${base}/service/shule-trips/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'shule-trip',
        'x-organization-id': input.organizationId,
      },
      body: JSON.stringify({
        trip: {
          ...input.trip,
          departAt: input.trip.departAt ? input.trip.departAt.toISOString() : null,
          returnAt: input.trip.returnAt ? input.trip.returnAt.toISOString() : null,
        },
        participants: input.participants,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn('[ShuleTrip] ParentMIS trip publish failed:', res.status, text);
    }
  } catch (err) {
    console.warn('[ShuleTrip] ParentMIS trip publish error:', err instanceof Error ? err.message : err);
  }
}
