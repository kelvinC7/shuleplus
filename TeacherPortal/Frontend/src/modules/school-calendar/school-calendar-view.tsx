'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, MapPin, RefreshCw, X } from 'lucide-react';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import { fetchCalendarEvents, workApiError, type CalendarEvent } from '@/services/teacher-work-api';

const EVENT_TYPES = [
  { id: 'all', label: 'All' },
  { id: 'academic', label: '📚 Academic' },
  { id: 'examination', label: '📝 Examination' },
  { id: 'event', label: '🎉 Event' },
  { id: 'holiday', label: '🏖️ Holiday' },
  { id: 'meeting', label: '👨‍🏫 Meeting' },
  { id: 'sports', label: '🏃 Sports' },
  { id: 'parent', label: '👨‍👩‍👧 Parent' },
  { id: 'training', label: '🎓 Training' },
  { id: 'permission', label: '📌 My Permission' },
];

const TYPE_COLORS: Record<string, string> = {
  academic: 'bg-sky-100 text-sky-800 border-sky-200',
  examination: 'bg-violet-100 text-violet-800 border-violet-200',
  event: 'bg-pink-100 text-pink-800 border-pink-200',
  holiday: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  meeting: 'bg-amber-100 text-amber-900 border-amber-200',
  sports: 'bg-orange-100 text-orange-800 border-orange-200',
  parent: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  training: 'bg-teal-100 text-teal-800 border-teal-200',
  permission: 'bg-slate-100 text-slate-800 border-slate-200',
};

export function SchoolCalendarView() {
  const { term, academicYear, setTerm, setAcademicYear, settings } = useAcademicSettings();
  const [view, setView] = useState<'month' | 'agenda'>('month');
  const [cursor, setCursor] = useState(new Date());
  const [eventType, setEventType] = useState('all');
  const [myEventsOnly, setMyEventsOnly] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const monthStart = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1), [cursor]);
  const monthEnd = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0), [cursor]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEvents(
        await fetchCalendarEvents({
          start: monthStart.toISOString().slice(0, 10),
          end: monthEnd.toISOString().slice(0, 10),
          eventType: eventType === 'all' ? undefined : eventType,
          academicYear,
          term,
          myEventsOnly,
        })
      );
    } catch (err) {
      setError(workApiError(err, 'Could not load calendar'));
    } finally {
      setLoading(false);
    }
  }, [monthStart, monthEnd, eventType, academicYear, term, myEventsOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  const calendarCells = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);

  return (
    <div className="min-w-0 max-w-full space-y-4 pb-8 sm:space-y-6">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-primary">
              <CalendarDays className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">School Calendar</span>
            </div>
            <h1 className="mt-1 text-xl font-bold text-navy sm:text-2xl">School Calendar</h1>
            <p className="mt-1 text-sm text-muted">Events, holidays, meetings, exams, and your approved permissions.</p>
          </div>
          <button type="button" className="btn-secondary inline-flex items-center gap-2 text-sm" onClick={() => void load()}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select className="input py-2 text-sm" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
            {(settings?.academicYears ?? [academicYear]).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="input py-2 text-sm" value={term} onChange={(e) => setTerm(e.target.value)}>
            {(settings?.terms ?? [term]).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="input py-2 text-sm" value={eventType} onChange={(e) => setEventType(e.target.value)}>
            {EVENT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <label className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm">
            <input type="checkbox" checked={myEventsOnly} onChange={(e) => setMyEventsOnly(e.target.checked)} />
            My events only
          </label>
        </div>
      </div>

      <div className="inline-flex rounded-xl border border-border bg-white p-1">
        {(['month', 'agenda'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize ${view === v ? 'bg-primary text-navy' : 'text-muted'}`}
          >
            {v}
          </button>
        ))}
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

      {view === 'month' ? (
        <div className="rounded-2xl border border-border bg-white p-3 shadow-sm sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" className="rounded-lg border border-border p-2" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="font-bold text-navy">{cursor.toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
            <button type="button" className="rounded-lg border border-border p-2" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-muted">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {calendarCells.map((cell) => {
              const dayEvents = events.filter((e) => e.startDate <= cell.iso && e.endDate >= cell.iso);
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => dayEvents[0] && setSelected(dayEvents[0])}
                  className={`min-h-[4.5rem] rounded-lg border p-1 text-left text-xs ${
                    cell.inMonth ? 'border-border bg-white' : 'border-transparent bg-slate-50/50 text-muted'
                  } ${cell.isToday ? 'ring-2 ring-primary' : ''}`}
                >
                  <span className="font-semibold">{cell.day}</span>
                  <div className="mt-0.5 space-y-0.5">
                    {dayEvents.slice(0, 2).map((e) => (
                      <div key={e.id} className={`truncate rounded px-0.5 text-[9px] ${TYPE_COLORS[e.eventType]?.split(' ')[0] ?? 'bg-slate-100'}`}>
                        {e.title}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : events.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No events this month.</p>
          ) : (
            events.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setSelected(e)}
                className="flex w-full items-start gap-3 rounded-xl border border-border bg-white p-4 text-left shadow-sm"
              >
                <div className={`mt-0.5 rounded-lg border px-2 py-1 text-[10px] font-bold uppercase ${TYPE_COLORS[e.eventType] ?? ''}`}>
                  {e.eventType}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-navy">{e.title}</p>
                  <p className="text-sm text-muted">
                    {e.startDate}{e.startTime ? ` · ${e.startTime}${e.endTime ? `–${e.endTime}` : ''}` : ''}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex justify-between">
              <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${TYPE_COLORS[selected.eventType] ?? ''}`}>
                {selected.eventType}
              </span>
              <button type="button" onClick={() => setSelected(null)}><X className="h-5 w-5 text-muted" /></button>
            </div>
            <h3 className="mt-3 text-lg font-bold text-navy">{selected.title}</h3>
            <p className="mt-2 text-sm text-muted">📅 {selected.startDate}{selected.endDate !== selected.startDate ? ` – ${selected.endDate}` : ''}</p>
            {selected.startTime ? <p className="text-sm text-muted">🕐 {selected.startTime} – {selected.endTime ?? '—'}</p> : null}
            {selected.location ? <p className="mt-1 flex items-center gap-1 text-sm"><MapPin className="h-4 w-4" /> {selected.location}</p> : null}
            {selected.organizer ? <p className="mt-2 text-sm">Organized by {selected.organizer}</p> : null}
            {selected.description ? <p className="mt-2 text-sm text-muted">{selected.description}</p> : null}
            {selected.participants ? <p className="mt-1 text-xs text-muted">👥 {selected.participants}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);
  const cells: Array<{ iso: string; day: number; inMonth: boolean; isToday: boolean }> = [];

  for (let i = 0; i < startPad; i++) {
    const d = new Date(year, month, -startPad + i + 1);
    cells.push({ iso: d.toISOString().slice(0, 10), day: d.getDate(), inMonth: false, isToday: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = new Date(year, month, d).toISOString().slice(0, 10);
    cells.push({ iso, day: d, inMonth: true, isToday: iso === today });
  }
  while (cells.length % 7 !== 0) {
    const d = new Date(year, month + 1, cells.length - startPad - daysInMonth + 1);
    cells.push({ iso: d.toISOString().slice(0, 10), day: d.getDate(), inMonth: false, isToday: false });
  }
  return cells;
}
