import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/services/api';
import type { Student } from '@/types';
import type { MissingFieldId } from '../types';
import { enrichStudent, getMissingFields, isIncompleteProfile } from '../utils';

const PAGE_SIZE = 20;

export function useMissingInformationData() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fieldFilter, setFieldFilter] = useState<MissingFieldId | 'all'>('all');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/students');
      setStudents(res.data.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const incompleteRows = useMemo(() => {
    return students.map(enrichStudent).filter(isIncompleteProfile);
  }, [students]);

  const fieldCounts = useMemo(() => {
    const counts: Record<MissingFieldId, number> = {
      parent: 0,
      phone: 0,
      dateOfBirth: 0,
      photo: 0,
      address: 0,
      sdmCode: 0,
    };
    for (const row of incompleteRows) {
      for (const field of getMissingFields(row)) {
        counts[field]++;
      }
    }
    return counts;
  }, [incompleteRows]);

  const filtered = useMemo(() => {
    let list = incompleteRows;
    if (fieldFilter !== 'all') {
      list = list.filter((r) => getMissingFields(r).includes(fieldFilter));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.fullName.toLowerCase().includes(q) ||
          r.studentCode.toLowerCase().includes(q) ||
          r.className.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [incompleteRows, fieldFilter, search]);

  useEffect(() => {
    setPage(1);
  }, [fieldFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  return {
    loading,
    incompleteRows,
    fieldCounts,
    filtered,
    paginated,
    search,
    setSearch,
    fieldFilter,
    setFieldFilter,
    page,
    setPage,
    totalPages,
    reload: load,
  };
}
