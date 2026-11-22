import { useEffect, useState } from 'react';
import { govApi } from '@/services/api';
import type { GovTripRow } from '@/government/components/gov-applications-table';

export function useGovApplications(options?: { status?: string; stage?: string; queue?: 'actionable' }) {
  const [rows, setRows] = useState<GovTripRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (options?.status) params.set('status', options.status);
        if (options?.stage) params.set('stage', options.stage);
        if (options?.queue) params.set('queue', options.queue);
        const qs = params.toString() ? `?${params.toString()}` : '';
        const { data } = await govApi.get<{ data: GovTripRow[] }>(`/government/applications${qs}`);
        if (!cancelled) setRows(data.data);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [options?.status, options?.stage, options?.queue]);

  return { rows, loading };
}
