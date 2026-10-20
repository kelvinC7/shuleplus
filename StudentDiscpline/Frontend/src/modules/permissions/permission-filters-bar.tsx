'use client';

import type { ReactNode } from 'react';
import { Calendar, Filter, Search, X } from 'lucide-react';
import { PERMISSION_STATUSES, PERMISSION_TYPES } from '@/modules/permissions/permission-utils';
import type { SmClass } from '@/types/discipline';

interface PermissionFiltersBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  academicYear: string;
  onAcademicYearChange: (v: string) => void;
  yearOptions: string[];
  term: string;
  onTermChange: (v: string) => void;
  termOptions: string[];
  classFilter: string;
  onClassFilterChange: (v: string) => void;
  classes: SmClass[];
  typeFilter: string;
  onTypeFilterChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  dateFilter: string;
  onDateFilterChange: (v: string) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
  onClear: () => void;
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <label className="flex min-w-[130px] flex-1 flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
        ) : null}
        <select
          className={`w-full rounded-xl border border-slate-200 bg-white py-2 pr-8 text-sm font-medium text-[#000435] shadow-sm outline-none transition focus:border-[#fcb038]/60 focus:ring-2 focus:ring-[#fcb038]/20 ${icon ? 'pl-8' : 'pl-3'}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {children}
        </select>
      </div>
    </label>
  );
}

export function PermissionFiltersBar(props: PermissionFiltersBarProps) {
  const activeCount = [
    props.search,
    props.classFilter,
    props.typeFilter,
    props.statusFilter,
    props.dateFilter && props.dateFilter !== 'today',
    props.customFrom,
    props.customTo,
  ].filter(Boolean).length;

  return (
    <div className="hr-card mb-4 overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Filter size={14} />
          Filters
          {activeCount > 0 ? (
            <span className="rounded-full bg-[#000435] px-2 py-0.5 text-[10px] text-white">{activeCount}</span>
          ) : null}
        </div>
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={props.onClear}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-white hover:text-[#000435]"
          >
            <X size={14} /> Clear all
          </button>
        ) : null}
      </div>

      <div className="space-y-3 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-[#000435] shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#fcb038]/60 focus:ring-2 focus:ring-[#fcb038]/20"
            placeholder="Search student name, student code, reference…"
            value={props.search}
            onChange={(e) => props.onSearchChange(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <FilterSelect label="Academic Year" value={props.academicYear} onChange={props.onAcademicYearChange}>
            {props.yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </FilterSelect>

          <FilterSelect label="Term" value={props.term} onChange={props.onTermChange}>
            {props.termOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </FilterSelect>

          <FilterSelect label="Class" value={props.classFilter} onChange={props.onClassFilterChange}>
            <option value="">All Classes</option>
            {props.classes.map((c) => (
              <option key={c.id} value={c.label}>{c.label}</option>
            ))}
          </FilterSelect>

          <FilterSelect label="Permission Type" value={props.typeFilter} onChange={props.onTypeFilterChange}>
            <option value="">All Types</option>
            {PERMISSION_TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </FilterSelect>

          <FilterSelect label="Status" value={props.statusFilter} onChange={props.onStatusFilterChange}>
            <option value="">All Status</option>
            {PERMISSION_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="Date"
            value={props.dateFilter}
            onChange={props.onDateFilterChange}
            icon={<Calendar size={14} />}
          >
            <option value="">All Dates</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Date</option>
          </FilterSelect>
        </div>

        {props.dateFilter === 'custom' ? (
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">From</span>
              <input
                type="date"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                value={props.customFrom}
                onChange={(e) => props.onCustomFromChange(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">To</span>
              <input
                type="date"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                value={props.customTo}
                onChange={(e) => props.onCustomToChange(e.target.value)}
              />
            </label>
          </div>
        ) : null}
      </div>
    </div>
  );
}
