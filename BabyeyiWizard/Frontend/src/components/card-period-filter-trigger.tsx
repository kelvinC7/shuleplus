'use client';

import { MoreHorizontal } from 'lucide-react';
import { useAcademicPeriod } from '@/contexts/academic-period-context';

export function CardPeriodFilterTrigger() {
  const { openFilterModal } = useAcademicPeriod();

  return (
    <button
      type="button"
      onClick={openFilterModal}
      aria-label="Filter by academic year and term"
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-navy/10 text-navy/45 transition hover:border-primary/40 hover:bg-primary/10 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <MoreHorizontal size={16} />
    </button>
  );
}
