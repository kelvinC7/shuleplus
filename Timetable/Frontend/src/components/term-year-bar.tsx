'use client';

import { ReactNode } from 'react';
import { TERMS, currentAcademicYear } from '@/types';
import { SelectField } from '@/components/form-fields';

interface TermYearBarProps {
  term: string;
  academicYear: string;
  onTermChange: (term: string) => void;
  onYearChange: (year: string) => void;
  /** Org-defined terms from Organization Admin academic settings */
  terms?: string[];
  /** Org-defined academic years from Organization Admin academic settings */
  academicYears?: string[];
  compact?: boolean;
  extra?: ReactNode;
}

export function TermYearBar({
  term,
  academicYear,
  onTermChange,
  onYearChange,
  terms,
  academicYears,
  compact = false,
  extra,
}: TermYearBarProps) {
  const yearOptions = academicYears?.length ? academicYears : [currentAcademicYear()];
  const termOptions = terms?.length ? terms : [...TERMS];

  return (
    <div className={compact ? '' : 'hr-card p-4 sm:p-5'}>
      <div
        className={`grid gap-3 ${
          compact
            ? 'sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end'
            : 'sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end'
        }`}
      >
        <SelectField
          label="Academic year"
          value={academicYear}
          onChange={onYearChange}
          placeholder=""
          options={yearOptions.map((y) => ({ value: y, label: y }))}
        />
        <SelectField
          label="Term"
          value={term}
          onChange={onTermChange}
          placeholder=""
          options={termOptions.map((t) => ({ value: t, label: t }))}
        />
        {extra ? <div className="flex flex-wrap items-end gap-2 lg:justify-end">{extra}</div> : null}
      </div>
    </div>
  );
}
