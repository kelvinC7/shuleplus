import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, fetchAcademicSettings } from '@/services/api';
import type { ApiClass, Student } from '@/types';
import type { AcademicSettings } from '@/types';
import {
  DEFAULT_FILTERS,
  REPORT_COLUMNS,
  type ReportColumnId,
  type ReportFilters,
  type SortDir,
  type SortField,
} from '../types';
import {
  applyReportFilters,
  computeKpis,
  enrichStudent,
  sortReportRows,
} from '../utils';

const PAGE_SIZE = 25;

export function useStudentReportsData() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [academicSettings, setAcademicSettings] = useState<AcademicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerStudentId, setDrawerStudentId] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<ReportColumnId>>(
    () => new Set(REPORT_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id))
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stuRes, clsRes, settings] = await Promise.all([
        api.get('/students'),
        api.get('/classes'),
        fetchAcademicSettings().catch(() => null),
      ]);
      setStudents(stuRes.data.data ?? []);
      setClasses(clsRes.data.data ?? []);
      setAcademicSettings(settings);
      if (settings) {
        setFilters((f) => ({
          ...f,
          academicYear: f.academicYear || settings.currentAcademicYear || '',
          term: f.term || settings.currentTerm || '',
        }));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const enriched = useMemo(() => students.map(enrichStudent), [students]);
  const filtered = useMemo(() => applyReportFilters(enriched, filters), [enriched, filters]);
  const sorted = useMemo(() => sortReportRows(filtered, sortField, sortDir), [filtered, sortField, sortDir]);
  const kpis = useMemo(() => computeKpis(filtered), [filtered]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, page]);

  useEffect(() => {
    setPage(1);
  }, [filters, sortField, sortDir]);

  const drawerStudent = useMemo(
    () => enriched.find((r) => r.student.id === drawerStudentId) ?? null,
    [enriched, drawerStudentId]
  );

  function updateFilter<K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value, preset: key === 'preset' ? (value as ReportFilters['preset']) : 'all' }));
  }

  function clearFilters() {
    setFilters({
      ...DEFAULT_FILTERS,
      academicYear: academicSettings?.currentAcademicYear ?? '',
    });
  }

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function toggleColumn(id: ReportColumnId) {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    if (checked) setSelectedIds(new Set(paginated.map((r) => r.student.id)));
    else setSelectedIds(new Set());
  }

  const selectedRows = useMemo(
    () => sorted.filter((r) => selectedIds.has(r.student.id)),
    [sorted, selectedIds]
  );

  return {
    loading,
    students,
    classes,
    academicSettings,
    filters,
    filtersOpen,
    setFiltersOpen,
    updateFilter,
    setFilters,
    clearFilters,
    sortField,
    sortDir,
    toggleSort,
    page,
    setPage,
    totalPages,
    paginated,
    filtered,
    sorted,
    kpis,
    selectedIds,
    selectedRows,
    toggleSelect,
    toggleSelectAll,
    clearSelection: () => setSelectedIds(new Set()),
    drawerStudent,
    drawerStudentId,
    setDrawerStudentId,
    visibleColumns,
    toggleColumn,
    reload: load,
  };
}
