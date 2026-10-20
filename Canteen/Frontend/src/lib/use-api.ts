'use client';

import { useCallback, useEffect, useState } from 'react';
import { getData } from '@/services/api';

export function useApi<T>(url: string | null, params?: Record<string, unknown>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getData<T>(url, params);
      setData(result);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to load data'
      );
    } finally {
      setLoading(false);
    }
  }, [url, JSON.stringify(params ?? {})]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
