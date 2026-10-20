import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/services/api';
import type { PromotionGroup, PromotionRecord } from '../types';
import { groupPromotionRecords } from '../utils';

export function usePromotionRecords(academicYear?: string) {
  const [records, setRecords] = useState<PromotionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string | null>(null);

  const groups = useMemo(() => groupPromotionRecords(records), [records]);

  const fetchRecords = useCallback(async (): Promise<PromotionGroup[]> => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (academicYear) params.academicYear = academicYear;
      if (search.trim()) params.search = search.trim();
      if (classFilter) params.classId = classFilter;
      const res = await api.get('/enrollments/promotions', { params });
      const rows: PromotionRecord[] = res.data.data ?? [];
      setRecords(rows);
      return groupPromotionRecords(rows);
    } finally {
      setLoading(false);
    }
  }, [academicYear, search, classFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchRecords();
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchRecords, search]);

  const removeStudent = useCallback(
    async (recordId: string) => {
      await api.delete(`/enrollments/promotions/${recordId}`);
      return fetchRecords();
    },
    [fetchRecords]
  );

  const addStudent = useCallback(
    async (group: PromotionGroup, enrollmentId: string) => {
      await api.post('/enrollments/promote', {
        enrollmentId,
        newClassId: group.toClassId,
        newAcademicYear: group.toYear,
      });
      return fetchRecords();
    },
    [fetchRecords]
  );

  const deleteGroup = useCallback(
    async (group: PromotionGroup) => {
      for (const record of group.records) {
        await api.delete(`/enrollments/promotions/${record.id}`);
      }
      return fetchRecords();
    },
    [fetchRecords]
  );

  return {
    records,
    groups,
    loading,
    search,
    setSearch,
    classFilter,
    setClassFilter,
    fetchRecords,
    removeStudent,
    addStudent,
    deleteGroup,
  };
}
