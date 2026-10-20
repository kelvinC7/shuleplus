'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { SampleRecord } from '@/types';

export function useRecords() {
  const [records, setRecords] = useState<SampleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/records');
      setRecords(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { records, loading, reload };
}
