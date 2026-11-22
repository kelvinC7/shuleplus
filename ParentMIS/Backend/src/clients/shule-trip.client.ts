import { env } from '../config/env';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isShuleTripTripId(tripId: string): boolean {
  return UUID_RE.test(tripId.trim());
}

export async function recordShuleTripGuardianConsent(input: {
  organizationId: string;
  tripId: string;
  studentId: string;
  guardianPhone: string;
  approved: boolean;
}): Promise<void> {
  if (!env.SHULETRIP_API_URL) return;
  if (!isShuleTripTripId(input.tripId)) return;

  const res = await fetch(
    `${env.SHULETRIP_API_URL}/service/trips/${encodeURIComponent(input.tripId)}/guardian-consent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'parentmis',
        'x-organization-id': input.organizationId,
      },
      body: JSON.stringify({
        studentId: input.studentId,
        guardianPhone: input.guardianPhone,
        approved: input.approved,
      }),
      signal: AbortSignal.timeout(12_000),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`ShuleTrip consent sync failed (${res.status}): ${text}`);
  }
}
