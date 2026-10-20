'use client';

import type { ReactNode } from 'react';
import { CaFilterBar } from '@/components/chief-accountant/ca-filter-bar';

type FilterBarProps = {
  onRefresh?: () => void;
  refreshing?: boolean;
  extraFilters?: ReactNode;
};

/** Sticky scope + table filters in one panel (no duplicate tab bar). */
export function CaSchoolFeesToolbar({
  tableFilters,
  ...filterBar
}: FilterBarProps & { tableFilters?: ReactNode }) {
  return (
    <div className="sticky top-[104px] z-20 overflow-hidden rounded-2xl border border-border/80 bg-white shadow-sm print:hidden">
      <CaFilterBar {...filterBar} embedded />
      {tableFilters ? (
        <div className="border-t border-border/60 bg-[#f8f9fc]/90 px-4 py-4 backdrop-blur-sm">{tableFilters}</div>
      ) : null}
    </div>
  );
}
