'use client';

import { useCallback, useEffect, useState } from 'react';
import { RotateCcw, Filter } from 'lucide-react';
import { procurementApi } from '@/services/procurement-api';
import type { Department } from '@/types';

export interface ReportFilters {
  academicYear: string;
  term: string;
  dateFrom: string;
  dateTo: string;
  status: string;
  categoryId: string;
  departmentId: string;
  requesterId: string;
}

const EMPTY: ReportFilters = {
  academicYear: '',
  term: '',
  dateFrom: '',
  dateTo: '',
  status: 'ALL',
  categoryId: '',
  departmentId: '',
  requesterId: '',
};

export function useReportFilters(initial?: Partial<ReportFilters>) {
  const [filters, setFilters] = useState<ReportFilters>({ ...EMPTY, ...initial });
  const [applied, setApplied] = useState<ReportFilters>({ ...EMPTY, ...initial });
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    procurementApi.departments.list().then(setDepartments).catch(() => {});
  }, []);

  const apply = useCallback(() => setApplied({ ...filters }), [filters]);
  const reset = useCallback(() => {
    const next = { ...EMPTY, ...initial };
    setFilters(next);
    setApplied(next);
  }, [initial]);

  return { filters, setFilters, applied, apply, reset, departments };
}

interface ReportFilterBarProps {
  filters: ReportFilters;
  onChange: (next: ReportFilters) => void;
  onApply: () => void;
  onReset: () => void;
  departments: Department[];
  showStatus?: boolean;
  showDepartment?: boolean;
  showRequester?: boolean;
  comparisonNote?: string;
}

export function ReportFilterBar({
  filters,
  onChange,
  onApply,
  onReset,
  departments,
  showStatus = true,
  showDepartment = false,
  showRequester = false,
  comparisonNote,
}: ReportFilterBarProps) {
  const set = (key: keyof ReportFilters, value: string) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy">
        <Filter className="h-4 w-4 text-[#fcb038]" />
        Filters
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Academic Year</span>
          <input
            type="text"
            placeholder="e.g. 2025-2026"
            value={filters.academicYear}
            onChange={(e) => set('academicYear', e.target.value)}
            className="form-input w-full"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Term</span>
          <select
            value={filters.term}
            onChange={(e) => set('term', e.target.value)}
            className="form-input w-full"
          >
            <option value="">All terms</option>
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Date From</span>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => set('dateFrom', e.target.value)}
            className="form-input w-full"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Date To</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => set('dateTo', e.target.value)}
            className="form-input w-full"
          />
        </label>
        {showStatus ? (
          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Status</span>
            <select
              value={filters.status}
              onChange={(e) => set('status', e.target.value)}
              className="form-input w-full"
            >
              <option value="ALL">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="MD_APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CONVERTED_TO_PO">Completed</option>
            </select>
          </label>
        ) : null}
        {showDepartment ? (
          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Department</span>
            <select
              value={filters.departmentId}
              onChange={(e) => set('departmentId', e.target.value)}
              className="form-input w-full"
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      {comparisonNote ? (
        <p className="mt-3 text-xs text-muted">{comparisonNote}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={onApply} className="btn-primary text-sm">
          Apply Filters
        </button>
        <button type="button" onClick={onReset} className="btn-secondary text-sm">
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
      </div>
    </div>
  );
}

export function filtersToParams(f: ReportFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (f.academicYear) params.academicYear = f.academicYear;
  if (f.term) params.term = f.term;
  if (f.dateFrom) params.dateFrom = f.dateFrom;
  if (f.dateTo) params.dateTo = f.dateTo;
  if (f.status && f.status !== 'ALL') params.status = f.status;
  if (f.categoryId) params.categoryId = f.categoryId;
  if (f.departmentId) params.departmentId = f.departmentId;
  if (f.requesterId) params.requesterId = f.requesterId;
  return params;
}
