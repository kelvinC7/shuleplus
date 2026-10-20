'use client';

import { ChevronLeftIcon, ChevronRightIcon } from './icons';
import { cn } from '@/lib/utils';
import { useSiteLanguage } from './language-provider';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

function pageList(page: number, totalPages: number): (number | '…')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push('…');
    out.push(p);
    prev = p;
  }
  return out;
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  const { t } = useSiteLanguage();
  if (totalPages <= 1) return null;

  return (
    <div className="mx-auto my-11 mb-2 flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        aria-label={t.pagination.prev}
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border-[1.5px] border-ink-200 bg-white text-sm font-medium text-ink-700 transition-colors enabled:hover:border-sky-400 enabled:hover:text-sky-600 disabled:opacity-40"
      >
        <ChevronLeftIcon className="h-3.5 w-3.5" />
      </button>

      {pageList(page, totalPages).map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className="px-1 text-sm font-medium text-ink-400">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={cn(
              'flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border-[1.5px] border-ink-200 bg-white text-sm font-medium text-ink-700 transition-colors hover:border-sky-400 hover:text-sky-600',
              p === page && 'border-sky-500 bg-sky-500 text-white hover:border-sky-500 hover:text-white',
            )}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        aria-label={t.pagination.next}
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border-[1.5px] border-ink-200 bg-white text-sm font-medium text-ink-700 transition-colors enabled:hover:border-sky-400 enabled:hover:text-sky-600 disabled:opacity-40"
      >
        <ChevronRightIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
