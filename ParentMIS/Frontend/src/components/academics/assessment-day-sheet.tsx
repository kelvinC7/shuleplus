'use client';

import { useEffect } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { formatDate, daysLabel } from '@/lib/format';
import { formatAssessmentTitle } from '@/lib/academic-display';
import { cn } from '@/lib/utils';
import type { ScheduleItem } from '@/lib/academic-portal-utils';

type Props = {
  open: boolean;
  date: Date | null;
  items: ScheduleItem[];
  onClose: () => void;
};

function statusClass(status: string) {
  const s = status.toUpperCase();
  if (s.includes('DONE') || s.includes('COMPLETE')) return 'bg-emerald-50 text-emerald-800';
  if (s.includes('PROGRESS') || s.includes('ACTIVE')) return 'bg-sky-50 text-sky-900';
  return 'bg-amber-50 text-amber-950';
}

export function AssessmentDaySheet({ open, date, items, onClose }: Props) {
  // Lock page scroll while the sheet is open and allow Escape to close it
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || !date) return null;

  const iso = date.toISOString();
  const title = formatDate(iso);

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-navy/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="assessment-day-title"
        className="relative flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:max-h-[min(640px,85vh)] sm:max-w-lg sm:rounded-3xl"
      >
        {/* Grab handle (mobile) */}
        <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden>
          <span className="h-1.5 w-10 rounded-full bg-slate-300" />
        </div>

        <header className="flex items-center gap-3 px-4 pb-3 pt-3 sm:px-5 sm:pt-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-navy">
            <CalendarDays className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="assessment-day-title"
              className="truncate text-lg font-extrabold leading-tight text-navy"
            >
              {title}
            </h2>
            <p className="text-sm text-muted">
              {daysLabel(iso)}
              {items.length > 0 ? ` · ${items.length} ${items.length === 1 ? 'assessment' : 'assessments'}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-navy transition active:scale-95"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-5">
          {items.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-muted">
              No assessments scheduled for this day.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4"
                >
                  <p className="break-words text-base font-bold leading-snug text-navy">
                    {formatAssessmentTitle(item.title, item.subject)}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">{item.subject}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {item.type}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize',
                        statusClass(item.status)
                      )}
                    >
                      {item.status.replace(/_/g, ' ').toLowerCase()}
                    </span>
                    {'code' in item && item.code ? (
                      <span className="font-mono text-[11px] font-medium text-slate-500">
                        {String(item.code)}
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}