'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, LayoutList } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { AssessmentDaySheet } from '@/components/academics/assessment-day-sheet';
import { cn } from '@/lib/utils';
import { formatShortDate, daysLabel, formatDate } from '@/lib/format';
import { formatAssessmentTitle } from '@/lib/academic-display';
import type { ScheduleItem } from '@/lib/academic-portal-utils';

function monthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ day: number | null; key: string }> = [];
  for (let i = 0; i < startPad; i++) cells.push({ day: null, key: `p-${i}` });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, key: `d-${d}` });
  while (cells.length % 7 !== 0) cells.push({ day: null, key: `t-${cells.length}` });
  return cells;
}

function statusTone(_status: string) {
  return 'bg-slate-100 text-slate-600';
}

type Props = {
  schedule: ScheduleItem[];
  className?: string;
  term?: string;
  classNameLabel?: string;
};

export function AssessmentSchedulePanel({ schedule, className, term, classNameLabel }: Props) {
  const [view, setView] = useState<'list' | 'calendar'>('calendar');
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const scheduleByDay = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    for (const item of schedule) {
      if (!item.date) continue;
      const key = new Date(item.date).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [schedule]);

  const calYear = cursor.getFullYear();
  const calMonth = cursor.getMonth();
  const matrix = monthMatrix(calYear, calMonth);
  const todayKey = new Date().toDateString();

  const openDay = (date: Date, items: ScheduleItem[]) => {
    setSelectedDay(date);
    setSheetOpen(true);
    if (items.length === 0) return;
  };

  const sheetItems = selectedDay ? (scheduleByDay.get(selectedDay.toDateString()) ?? []) : [];

  return (
    <div className={cn('rounded-3xl border border-slate-200/90 bg-white p-3 shadow-sm sm:p-5', className)}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-extrabold text-navy">Assessment schedule</h2>
          <p className="text-xs text-muted">
            {classNameLabel ? `${classNameLabel} · ` : ''}
            {term || 'Current term'}
          </p>
        </div>
        <div className="inline-flex w-full gap-1 rounded-2xl bg-slate-100 p-1 sm:w-auto">
          <button
            type="button"
            onClick={() => setView('list')}
            className={cn(
              'inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition sm:flex-none',
              view === 'list' ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-navy'
            )}
          >
            <LayoutList className="size-4" /> List
          </button>
          <button
            type="button"
            onClick={() => setView('calendar')}
            className={cn(
              'inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition sm:flex-none',
              view === 'calendar' ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-navy'
            )}
          >
            <CalendarDays className="size-4" /> Calendar
          </button>
        </div>
      </div>

      {schedule.length === 0 ? (
        <EmptyState
          className="border-0 bg-slate-50/80 py-10"
          title="No assessments scheduled"
          description={
            classNameLabel
              ? `Nothing on the calendar for ${classNameLabel} in ${term || 'this term'}.`
              : 'Assessments for your child’s class appear here when teachers schedule them.'
          }
        />
      ) : view === 'list' ? (
        <div className="space-y-2">
          {schedule.map((item) => (
            <article
              key={item.id}
              className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {'code' in item && item.code ? (
                    <span className="font-mono text-[11px] font-medium text-primary">{String(item.code)}</span>
                  ) : null}
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase', statusTone(item.status))}>
                    {item.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="mt-1 break-words font-semibold text-navy">
                  {formatAssessmentTitle(item.title, item.subject)}
                </p>
                <p className="text-sm text-muted">
                  {item.subject} · {item.type}
                </p>
              </div>
              <div className="flex shrink-0 flex-col border-t border-slate-200/70 pt-2 sm:border-0 sm:pt-0 sm:text-right">
                <p className="text-sm font-bold text-navy">
                  {item.date ? formatDate(item.date) : 'Date to be confirmed'}
                </p>
                {item.date ? <p className="text-xs text-muted">{daysLabel(item.date)}</p> : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div>
          <div className="mb-4 flex items-center justify-between rounded-2xl bg-slate-50 px-2 py-2">
            <button
              type="button"
              aria-label="Previous month"
              className="grid h-10 w-10 place-items-center rounded-xl bg-white text-navy shadow-sm transition active:scale-95"
              onClick={() => setCursor(new Date(calYear, calMonth - 1, 1))}
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="text-sm font-extrabold text-navy">
              {cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
            </p>
            <button
              type="button"
              aria-label="Next month"
              className="grid h-10 w-10 place-items-center rounded-xl bg-white text-navy shadow-sm transition active:scale-95"
              onClick={() => setCursor(new Date(calYear, calMonth + 1, 1))}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1.5">
            {matrix.map((cell) => {
              if (cell.day == null) return <div key={cell.key} className="min-h-[52px] sm:min-h-[72px]" />;
              const date = new Date(calYear, calMonth, cell.day);
              const items = scheduleByDay.get(date.toDateString()) ?? [];
              const isToday = date.toDateString() === todayKey;
              const hasItems = items.length > 0;
              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => openDay(date, items)}
                  className={cn(
                    'flex min-h-[52px] flex-col rounded-xl border p-1.5 text-left transition sm:min-h-[72px] sm:p-2',
                    hasItems
                      ? 'border-amber-200/80 bg-gradient-to-b from-amber-50 to-white hover:border-amber-300 hover:shadow-md'
                      : 'border-slate-100 bg-slate-50/80 hover:border-slate-200 hover:bg-white',
                    isToday && 'ring-2 ring-navy ring-offset-1'
                  )}
                >
                  <span className={cn('text-xs font-bold tabular-nums', hasItems ? 'text-navy' : 'text-slate-500')}>
                    {cell.day}
                  </span>
                  {hasItems ? (
                    <div className="mt-1 flex-1 space-y-0.5 overflow-hidden">
                      {items.slice(0, 2).map((it) => (
                        <p key={it.id} className="truncate text-[9px] font-semibold leading-tight text-navy sm:text-[10px]">
                          {it.subject}
                        </p>
                      ))}
                      {items.length > 2 ? (
                        <p className="text-[9px] font-bold text-amber-700">+{items.length - 2} more</p>
                      ) : null}
                    </div>
                  ) : (
                    <span className="mt-auto hidden text-[9px] text-slate-400 sm:block">Tap for details</span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-center text-xs text-muted">Tap any date to view scheduled assessments.</p>
        </div>
      )}

      <AssessmentDaySheet
        open={sheetOpen}
        date={selectedDay}
        items={sheetItems}
        onClose={() => {
          setSheetOpen(false);
          setSelectedDay(null);
        }}
      />
    </div>
  );
}
