import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { PageHeader } from '@/shared/layouts/portal-shell';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSchoolTrips } from '@/schools/hooks/use-school-trips';
import { dateToKey, formatTripTime, tripDateKey } from '@/schools/utils/trip-display';
import { cn } from '@/shared/cn';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function calendarCells(viewMonth: Date): Array<{ date: Date; inMonth: boolean }> {
  const first = startOfMonth(viewMonth);
  const startPad = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - startPad);
  const cells: Array<{ date: Date; inMonth: boolean }> = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    cells.push({ date, inMonth: date.getMonth() === viewMonth.getMonth() });
  }
  return cells;
}

export default function TripCalendarPage() {
  const { rows, loading } = useSchoolTrips();
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [selectedKey, setSelectedKey] = useState<string | null>(tripDateKey(new Date().toISOString()));

  const tripsByDay = useMemo(() => {
    const map = new Map<string, typeof rows>();
    for (const t of rows) {
      const key = tripDateKey(t.departAt);
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    return map;
  }, [rows]);

  const unscheduled = useMemo(() => rows.filter((t) => !t.departAt && t.status !== 'CANCELLED'), [rows]);

  const selectedTrips = selectedKey ? (tripsByDay.get(selectedKey) ?? []) : [];
  const monthLabel = viewMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const cells = calendarCells(viewMonth);
  const todayKey = tripDateKey(new Date().toISOString());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trip calendar"
        description="Departure dates for all applications · plan supervision and transport around your school calendar."
        action={
          <Link to="/school/trips/new">
            <Button variant="amber">New trip</Button>
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-line bg-slate-50/80 px-5 py-4">
            <button type="button" className="rounded-lg p-2 hover:bg-white" onClick={() => setViewMonth((m) => addMonths(m, -1))} aria-label="Previous month">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <p className="text-base font-bold text-navy">{monthLabel}</p>
            <button type="button" className="rounded-lg p-2 hover:bg-white" onClick={() => setViewMonth((m) => addMonths(m, 1))} aria-label="Next month">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 border-b border-line bg-white text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>

          {loading ? (
            <p className="py-20 text-center text-sm text-slate-500">Loading calendar…</p>
          ) : (
            <div className="grid grid-cols-7">
              {cells.map(({ date, inMonth }) => {
                const key = dateToKey(date);
                const dayTrips = key ? (tripsByDay.get(key) ?? []) : [];
                const isToday = key === todayKey;
                const selected = key === selectedKey;
                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    onClick={() => key && setSelectedKey(key)}
                    className={cn(
                      'min-h-[88px] border-b border-r border-line p-2 text-left transition hover:bg-amber-soft/30',
                      !inMonth && 'bg-slate-50/50 text-slate-400',
                      selected && 'bg-amber-soft/60 ring-2 ring-inset ring-amber/40'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                        isToday && 'bg-navy text-white',
                        !isToday && 'text-slate-700'
                      )}
                    >
                      {date.getDate()}
                    </span>
                    <div className="mt-1 space-y-1">
                      {dayTrips.slice(0, 2).map((t) => (
                        <span key={t.id} className="block truncate rounded-md bg-navy/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {t.reference}
                        </span>
                      ))}
                      {dayTrips.length > 2 ? (
                        <span className="text-[10px] font-semibold text-slate-500">+{dayTrips.length - 2} more</span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Selected day</p>
            <p className="mt-1 text-lg font-bold text-navy">
              {selectedKey
                ? new Date(selectedKey + 'T12:00:00').toLocaleDateString(undefined, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })
                : 'Pick a day'}
            </p>
            <ul className="mt-4 space-y-3">
              {selectedTrips.length === 0 ? (
                <li className="text-sm text-slate-500">No departures scheduled.</li>
              ) : (
                selectedTrips.map((t) => (
                  <li key={t.id} className="rounded-xl border border-line bg-slate-50/80 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-navy">{t.reference}</p>
                      <StatusBadge status={t.status} />
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{t.title}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3 w-3" />
                      {t.destination ?? 'TBD'} · {formatTripTime(t.departAt)}
                    </p>
                    <Link to={`/school/trips/${t.id}/edit`} className="mt-2 inline-block text-xs font-bold text-navy hover:underline">
                      Open trip →
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </Card>

          {unscheduled.length > 0 ? (
            <Card className="p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">No departure date yet</p>
              <ul className="mt-3 space-y-2">
                {unscheduled.slice(0, 5).map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-semibold text-slate-800">{t.title}</span>
                    <Link to={`/school/trips/${t.id}/edit`} className="shrink-0 text-xs font-bold text-navy">
                      Set dates
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
