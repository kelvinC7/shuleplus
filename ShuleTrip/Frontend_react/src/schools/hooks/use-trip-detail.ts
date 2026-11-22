import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { TripDetail } from '@/schools/types/trip';
import type { ReadinessReport } from '@/schools/types/trip';

export function useTripDetail(tripId: string | null) {
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [readiness, setReadiness] = useState<ReadinessReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) {
      setTrip(null);
      setReadiness(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [tripRes, readyRes] = await Promise.all([
          api.get<{ data: TripDetail }>(`/trips/${tripId}`),
          api.get<{ data: ReadinessReport }>(`/trips/${tripId}/readiness`),
        ]);
        if (!cancelled) {
          setTrip(tripRes.data.data);
          setReadiness(readyRes.data.data);
        }
      } catch {
        if (!cancelled) {
          setTrip(null);
          setReadiness(null);
          setError('Could not load trip details');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  return { trip, readiness, loading, error };
}
