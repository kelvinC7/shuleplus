'use client';

import { Building2, Loader2 } from 'lucide-react';
import type { PrintCardSchool } from '@/services/print-card-api';

type SchoolScopeBarProps = {
  schools: PrintCardSchool[];
  selectedSchool: PrintCardSchool | null;
  onSchoolChange: (school: PrintCardSchool | null) => void;
  canSelectSchools: boolean;
  viewAllSchools: boolean;
  onViewAllChange: (all: boolean) => void;
};

export function SchoolScopeBar({
  schools,
  selectedSchool,
  onSchoolChange,
  canSelectSchools,
  viewAllSchools,
  onViewAllChange,
}: SchoolScopeBarProps) {
  if (!canSelectSchools) {
    return selectedSchool ? (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-3">
        <Building2 className="h-4 w-4 shrink-0 text-muted" />
        <p className="text-sm text-muted">
          School: <span className="font-semibold text-navy">{selectedSchool.name}</span>
        </p>
      </div>
    ) : null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-white p-4 sm:flex-row sm:items-end">
      <label className="w-full min-w-0 flex-1 space-y-1 sm:max-w-sm">
        <span className="text-[11px] font-bold uppercase text-muted">School</span>
        <select
          value={viewAllSchools ? '__all__' : (selectedSchool?.id ?? '')}
          onChange={(e) => {
            if (e.target.value === '__all__') {
              onViewAllChange(true);
              return;
            }
            onViewAllChange(false);
            const school = schools.find((s) => s.id === e.target.value) ?? null;
            onSchoolChange(school);
          }}
          className="input w-full"
        >
          <option value="__all__">All schools</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <p className="text-sm text-muted sm:pb-2.5">
        {viewAllSchools
          ? 'Showing batches across all schools you can access.'
          : selectedSchool
            ? `Filtered to ${selectedSchool.name}.`
            : 'Select a school to filter results.'}
      </p>
    </div>
  );
}

export function PrintCardPageLoader() {
  return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted" />
    </div>
  );
}
