import { useEffect, useMemo, useState } from 'react';
import { api } from '@/services/api';
import type { SchoolTripListItem } from '@/schools/types/trip-list';

export function useSchoolTrips() {
  const [rows, setRows] = useState<SchoolTripListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get<{ data: SchoolTripListItem[] }>('/trips');
        if (!cancelled) setRows(data.data);
      } catch {
        if (!cancelled) {
          setRows([]);
          setError('Could not load trips');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const count = (s: string) => rows.filter((r) => r.status === s).length;
    return {
      total: rows.length,
      drafts: count('DRAFT'),
      inReview: rows.filter((r) => ['SUBMITTED', 'VALIDATION', 'UNDER_REVIEW', 'RESUBMITTED', 'AWAITING_ADDITIONAL_APPROVAL'].includes(r.status)).length,
      corrections: count('CORRECTION_REQUESTED'),
      approved: count('APPROVED'),
      inProgress: count('TRIP_IN_PROGRESS'),
      completed: count('COMPLETED'),
    };
  }, [rows]);

  return { rows, loading, error, stats, reload: async () => {
    const { data } = await api.get<{ data: SchoolTripListItem[] }>('/trips');
    setRows(data.data);
  } };
}
