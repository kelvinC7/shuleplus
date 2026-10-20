'use client';

import { useEffect, useState } from 'react';
import { Filter, RotateCcw, Search, Sparkles } from 'lucide-react';
import {
  fetchDistricts,
  fetchProvinces,
  fetchSectors,
  type LocationOption,
} from '@/services/print-card-api';
import { SchoolLogo } from '@/components/school-logo';

export type SchoolFilterValues = {
  provinceId: string;
  districtId: string;
  sectorId: string;
  search: string;
};

type Props = {
  values: SchoolFilterValues;
  onChange: (patch: Partial<SchoolFilterValues>) => void;
  onApply: () => void;
  loading?: boolean;
  resultCount?: number;
};

export function PrintCardSchoolToolbar({
  values,
  onChange,
  onApply,
  loading,
  resultCount,
}: Props) {
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [sectors, setSectors] = useState<LocationOption[]>([]);

  useEffect(() => {
    void fetchProvinces().then(setProvinces).catch(() => setProvinces([]));
  }, []);

  useEffect(() => {
    if (!values.provinceId) {
      setDistricts([]);
      return;
    }
    void fetchDistricts(values.provinceId).then(setDistricts).catch(() => setDistricts([]));
  }, [values.provinceId]);

  useEffect(() => {
    if (!values.districtId) {
      setSectors([]);
      return;
    }
    void fetchSectors(values.districtId).then(setSectors).catch(() => setSectors([]));
  }, [values.districtId]);

  const activeFilters = [
    values.provinceId ? provinces.find((p) => p.id === values.provinceId)?.name : null,
    values.districtId ? districts.find((d) => d.id === values.districtId)?.name : null,
    values.sectorId ? sectors.find((s) => s.id === values.sectorId)?.name : null,
    values.search.trim() || null,
  ].filter(Boolean);

  function clearFilters() {
    onChange({ provinceId: '', districtId: '', sectorId: '', search: '' });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="border-b border-border bg-gradient-to-r from-navy via-navy to-navy/90 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/10 p-1.5 sm:h-11 sm:w-11">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/yellow-icon.png" alt="" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-white">Find a school</p>
              <p className="text-xs text-white/70">Filter by Rwanda location or search by name</p>
            </div>
          </div>
          {typeof resultCount === 'number' && (
            <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
              {loading ? 'Loading…' : `${resultCount} school${resultCount === 1 ? '' : 's'}`}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Province</span>
            <select
              value={values.provinceId}
              onChange={(e) =>
                onChange({ provinceId: e.target.value, districtId: '', sectorId: '' })
              }
              className="input w-full"
            >
              <option value="">All provinces</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">District</span>
            <select
              value={values.districtId}
              onChange={(e) => onChange({ districtId: e.target.value, sectorId: '' })}
              className="input w-full"
              disabled={!values.provinceId}
            >
              <option value="">All districts</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Sector</span>
            <select
              value={values.sectorId}
              onChange={(e) => onChange({ sectorId: e.target.value })}
              className="input w-full"
              disabled={!values.districtId}
            >
              <option value="">All sectors</option>
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 sm:col-span-2 xl:col-span-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Search</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={values.search}
                onChange={(e) => onChange({ search: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && onApply()}
                placeholder="School name or email…"
                className="input w-full pl-10"
              />
            </div>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-primary" onClick={onApply} disabled={loading}>
            <Filter className="mr-2 inline h-4 w-4" />
            Apply filters
          </button>
          {activeFilters.length > 0 && (
            <button type="button" className="btn-secondary" onClick={clearFilters}>
              <RotateCcw className="mr-2 inline h-4 w-4" />
              Clear
            </button>
          )}
          {activeFilters.map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-navy"
            >
              <Sparkles className="h-3 w-3 text-primary" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SchoolListEmptyState({
  hasFilters,
  onClearFilters,
}: {
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/yellow-icon.png" alt="" className="h-full w-full object-contain opacity-60" />
      </div>
      <p className="font-semibold text-navy">No schools found</p>
      <p className="mt-1 max-w-sm text-sm text-muted">
        {hasFilters
          ? 'No schools match these filters. Try clearing location filters or search by school name.'
          : 'No active schools are registered yet.'}
      </p>
      {hasFilters && (
        <button type="button" className="btn-secondary mt-4" onClick={onClearFilters}>
          Clear all filters
        </button>
      )}
    </div>
  );
}

export function SchoolListItem({
  school,
  selected,
  onSelect,
}: {
  school: {
    id: string;
    name: string;
    district: string | null;
    sector: string | null;
    status: string;
    organizationCode?: string | null;
    locationComplete?: boolean;
    logoUrl?: string | null;
  };
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group w-full rounded-xl border p-3 text-left transition-all ${
        selected
          ? 'border-primary bg-gradient-to-br from-primary/10 to-white shadow-sm ring-1 ring-primary/20'
          : 'border-border hover:border-primary/30 hover:bg-slate-50/80'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1 ring-1 ring-border">
          <SchoolLogo logoUrl={school.logoUrl} name={school.name} className="h-full w-full" iconClassName="h-4 w-4" />
        </div>
        <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold text-navy group-hover:text-navy">{school.name}</p>
            <p className="mt-0.5 truncate text-xs text-muted">
              {[school.district, school.sector].filter(Boolean).join(' · ') || 'Location not set'}
            </p>
            {school.organizationCode && (
              <p className="mt-1 font-mono text-[10px] text-navy/60">{school.organizationCode}</p>
            )}
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              school.status === 'ACTIVE'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {school.status}
          </span>
        </div>
      </div>
      {school.locationComplete === false && (
        <p className="mt-2 pl-[52px] text-[10px] text-amber-700">Complete location in organization settings</p>
      )}
    </button>
  );
}

