'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/auth-context';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export function useFetch<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ApiEnvelope<T>>(path);
      setData((res.data as ApiEnvelope<T>).data ?? (res.data as T));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Unable to load data. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    setData(null);
    setLoading(true);
    reload();
  }, [reload]);

  return { data, loading, error, reload };
}

/**
 * Scoped variant of useFetch that appends the parent's currently active
 * student id (from auth context) and automatically refetches when the
 * active child changes.
 */
export function useStudentFetch<T>(path: string) {
  const { activeStudentId, linkedStudents } = useAuth();
  const code = linkedStudents.find((s) => s.id === activeStudentId)?.shuleCode;
  const params = new URLSearchParams();
  if (activeStudentId) params.set('studentId', activeStudentId);
  if (code) params.set('studentCode', code);
  const query = params.toString();
  const fullPath = query ? `${path}${path.includes('?') ? '&' : '?'}${query}` : path;
  return useFetch<T>(fullPath);
}
