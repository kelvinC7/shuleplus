'use client';

import type { SortKey, ViewMode } from '@/lib/types';
import { GridIcon, ListIcon } from './icons';
import { cn } from '@/lib/utils';
import { useSiteLanguage } from './language-provider';

interface ResultsHeaderProps {
  title: string;
  countText: string;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  onOpenFilters?: () => void;
  activeFilterCount?: number;
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}

export function ResultsHeader({
  title,
  countText,
  sort,
  onSortChange,
  view,
  onViewChange,
  onOpenFilters,
  activeFilterCount = 0,
}: ResultsHeaderProps) {
  const { t } = useSiteLanguage();

  return (
    <div className="mb-[22px] flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-[20px] font-semibold leading-tight sm:text-[22px]">{title}</h2>
        <p className="mt-1 text-[13px] text-ink-500 sm:text-[13.5px]">{countText}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        {onOpenFilters ? (
          <button
            type="button"
            onClick={onOpenFilters}
            className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-sky-200 bg-sky-50 px-4 py-2 text-[13px] font-medium text-sky-800 transition hover:bg-sky-100 lg:hidden"
          >
            <FilterIcon className="h-4 w-4" />
            {t.results.filters}
            {activeFilterCount > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-600 px-1.5 text-[10px] font-medium text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        ) : null}
        <label htmlFor="sortBy" className="hidden text-[13px] font-medium text-ink-500 sm:inline">
          {t.results.sortBy}
        </label>
        <select
          id="sortBy"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortKey)}
          className="min-w-0 flex-1 rounded-full border-[1.5px] border-ink-200 bg-white px-3.5 py-2 text-[13px] font-medium text-ink-700 outline-none focus:border-sky-400 sm:flex-none sm:text-[13.5px]"
        >
          <option value="relevant">{t.results.sortRelevant}</option>
          <option value="fees-asc">{t.results.sortFeesAsc}</option>
          <option value="name">{t.results.sortName}</option>
        </select>
        <div className="flex shrink-0 overflow-hidden rounded-[10px] border-[1.5px] border-ink-200">
          {(
            [
              { mode: 'grid' as ViewMode, Icon: GridIcon, label: t.results.gridView },
              { mode: 'list' as ViewMode, Icon: ListIcon, label: t.results.listView },
            ]
          ).map(({ mode, Icon, label }) => (
            <button
              key={mode}
              type="button"
              aria-label={label}
              onClick={() => onViewChange(mode)}
              className={cn('bg-white p-2 text-ink-500 transition-colors', view === mode && 'bg-sky-500 text-white')}
            >
              <Icon className="h-[15px] w-[15px]" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
