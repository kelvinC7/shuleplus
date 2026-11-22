import { api } from '@/services/api';
import type { SchoolTrip } from '@/types/shuletrip';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function submitTripConsent(
  tripId: string,
  body: {
    declined?: boolean;
    confirmations?: { read?: boolean; approve?: boolean; emergency?: boolean };
  }
): Promise<SchoolTrip> {
  const res = await api.post<ApiEnvelope<SchoolTrip>>(`/trips/${tripId}/consent`, body);
  return res.data.data;
}
