'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  X,
  GripVertical,
} from 'lucide-react';
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { apApi } from '@/services/action-plan-api';
import { ApPageLayout } from '@/components/ap-page-layout';
import {
  buildCalendarEvents,
  filterCalendarEvents,
  sameDay,
  STATUS_STYLES,
  type ActivityStatus,
  type CalendarEvent,
} from '@/lib/calendar-events';
import type { ActionPlan } from '@/types';

type ViewMode = 'month' | 'week' | 'day' | 'agenda';

const VIEW_TABS: { id: ViewMode; label: string }[] = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
  { id: 'agenda', label: 'Agenda' },
];

export function CalendarView({ initialPlanId }: { initialPlanId?: string }) {
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [meetings, setMeetings] = useState<Awaited<ReturnType<typeof apApi.listMeetings>>['data']['data']>([]);
  const [reviews, setReviews] = useState<Awaited<ReturnType<typeof apApi.listReviews>>['data']['data']>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState<ViewMode>('month');
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    planId: initialPlanId ?? '',
    department: '',
    owner: '',
    pillar: '',
    status: '' as '' | ActivityStatus,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, meetingsRes, reviewsRes] = await Promise.all([
        apApi.listPlans({ limit: 200 }),
        apApi.listMeetings(),
        apApi.listReviews(),
      ]);
      setPlans(plansRes.data.data ?? []);
      setMeetings(meetingsRes.data.data ?? []);
      setReviews(reviewsRes.data.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const allEvents = useMemo(
    () => buildCalendarEvents({ plans, meetings: meetings ?? [], reviews: reviews ?? [] }),
    [plans, meetings, reviews]
  );

  const events = useMemo(() => filterCalendarEvents(allEvents, filters), [allEvents, filters]);

  const departments = useMemo(
    () => [...new Set(plans.map((p) => p.department).filter(Boolean))] as string[],
    [plans]
  );
  const owners = useMemo(
    () => [...new Set(allEvents.map((e) => e.owner).filter(Boolean))] as string[],
    [allEvents]
  );
  const pillars = useMemo(
    () => [...new Set(allEvents.map((e) => e.pillar).filter(Boolean))] as string[],
    [allEvents]
  );

  const today = new Date();
  const todayEvents = events.filter((e) => sameDay(e.start, today));
  const upcomingEvents = events.filter((e) => e.start > today && e.status !== 'completed').slice(0, 8);

  function navigate(dir: -1 | 1) {
    if (view === 'month') setCursor((c) => addMonths(c, dir));
    else if (view === 'week') setCursor((c) => addWeeks(c, dir));
    else setCursor((c) => addDays(c, dir));
  }

  async function rescheduleTask(event: CalendarEvent, targetDate: Date) {
    if (!event.taskId) return;
    try {
      await apApi.updateTask(event.taskId, {
        dueDate: format(targetDate, 'yyyy-MM-dd'),
      });
      await load();
    } catch (err) {
      console.error(err);
    }
  }

  function onDropDay(day: Date) {
    if (!draggingId) return;
    const ev = events.find((e) => e.id === draggingId);
    if (ev?.taskId) void rescheduleTask(ev, day);
    setDraggingId(null);
  }

  function headerLabel() {
    if (view === 'month') return format(cursor, 'MMMM yyyy');
    if (view === 'week') {
      const ws = startOfWeek(cursor, { weekStartsOn: 0 });
      const we = endOfWeek(cursor, { weekStartsOn: 0 });
      return `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`;
    }
    return format(cursor, 'EEEE, MMMM d, yyyy');
  }

  function eventsForDay(day: Date) {
    return events.filter((e) => sameDay(e.start, day));
  }

  function EventPill({ event, compact }: { event: CalendarEvent; compact?: boolean }) {
    const st = STATUS_STYLES[event.status];
    return (
      <button
        type="button"
        draggable={!!event.taskId}
        onDragStart={() => event.taskId && setDraggingId(event.id)}
        onDragEnd={() => setDraggingId(null)}
        onClick={() => setSelected(event)}
        className={`flex w-full items-center gap-1 truncate rounded border px-1.5 py-0.5 text-left text-[10px] font-medium ${st.bg} ${st.text} ${st.border} hover:opacity-90`}
      >
        {event.taskId ? <GripVertical size={10} className="shrink-0 opacity-50" /> : null}
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${st.dot}`} />
        <span className="truncate">{compact ? event.title : `${event.title}`}</span>
      </button>
    );
  }

  function MonthGrid() {
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days: Date[] = [];
    for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);

    return (
      <div className="grid grid-cols-7 gap-px rounded-xl border border-border bg-border">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-muted">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const dayEvents = eventsForDay(day);
          const inMonth = isSameMonth(day, cursor);
          const isToday = isSameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDropDay(day)}
              className={`min-h-[100px] bg-white p-1.5 ${!inMonth ? 'opacity-40' : ''} ${isToday ? 'ring-2 ring-primary/30 ring-inset' : ''}`}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                  isToday ? 'bg-primary text-navy' : 'text-navy'
                }`}
              >
                {format(day, 'd')}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <EventPill key={ev.id} event={ev} compact />
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-[9px] text-muted">+{dayEvents.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function WeekGrid() {
    const ws = startOfWeek(cursor, { weekStartsOn: 0 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={`rounded-xl border border-border p-2 ${isSameDay(day, today) ? 'border-primary/40 bg-primary/5' : 'bg-white'}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDropDay(day)}
          >
            <p className="mb-2 text-xs font-bold text-navy">{format(day, 'EEE d')}</p>
            <div className="space-y-1">
              {eventsForDay(day).map((ev) => (
                <EventPill key={ev.id} event={ev} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function DayView() {
    const dayEvents = eventsForDay(cursor);
    return (
      <div className="rounded-xl border border-border bg-white p-4">
        <div className="space-y-2">
          {dayEvents.length === 0 ? (
            <p className="text-sm text-muted">No activities scheduled</p>
          ) : (
            dayEvents.map((ev) => (
              <div
                key={ev.id}
                className={`flex items-center gap-3 rounded-xl border p-3 ${STATUS_STYLES[ev.status].bg} ${STATUS_STYLES[ev.status].border}`}
              >
                <span className={`h-3 w-3 rounded-full ${STATUS_STYLES[ev.status].dot}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy">{ev.title}</p>
                  <p className="text-xs text-muted capitalize">
                    {ev.type} · {STATUS_STYLES[ev.status].label}
                    {ev.planTitle && ` · ${ev.planTitle}`}
                  </p>
                </div>
                <button type="button" onClick={() => setSelected(ev)} className="text-xs font-semibold text-navy">
                  Details
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  function AgendaView() {
    const upcoming = events.filter((e) => e.start >= startOfMonth(cursor) && e.start <= endOfMonth(addMonths(cursor, 2)));
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[10px] font-bold uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Activity</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {upcoming.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  No activities in range
                </td>
              </tr>
            ) : (
              upcoming.slice(0, 50).map((ev) => (
                <tr
                  key={ev.id}
                  className="cursor-pointer border-t border-slate-50 hover:bg-slate-50/80"
                  onClick={() => setSelected(ev)}
                >
                  <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                    {format(ev.start, 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3 font-medium text-navy">{ev.title}</td>
                  <td className="px-4 py-3 text-muted">{ev.planTitle ?? '—'}</td>
                  <td className="px-4 py-3 text-muted">{ev.owner ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[ev.status].bg} ${STATUS_STYLES[ev.status].text}`}>
                      {STATUS_STYLES[ev.status].label}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <ApPageLayout
      title="Calendar"
      subtitle="Plans, activities, deadlines, meetings and reviews"
      actions={
        <Link href="/tasks" className="btn-primary">
          <Plus size={14} />
          Add Activity
        </Link>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-white p-4">
            <CalendarDays size={20} className="text-navy" />
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
              {VIEW_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setView(t.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    view === t.id ? 'bg-navy text-white' : 'text-muted hover:text-navy'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={() => navigate(-1)} className="btn-secondary !p-2">
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-[160px] text-center text-sm font-bold text-navy">{headerLabel()}</span>
              <button type="button" onClick={() => navigate(1)} className="btn-secondary !p-2">
                <ChevronRight size={16} />
              </button>
              <button type="button" onClick={() => setCursor(new Date())} className="btn-secondary text-xs">
                Today
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid gap-2 rounded-2xl border border-border bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
            <select className="ap-input text-xs" value={filters.planId} onChange={(e) => setFilters({ ...filters, planId: e.target.value })}>
              <option value="">All plans</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
            <select className="ap-input text-xs" value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })}>
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select className="ap-input text-xs" value={filters.owner} onChange={(e) => setFilters({ ...filters, owner: e.target.value })}>
              <option value="">All owners</option>
              {owners.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            <select className="ap-input text-xs" value={filters.pillar} onChange={(e) => setFilters({ ...filters, pillar: e.target.value })}>
              <option value="">All pillars</option>
              {pillars.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select className="ap-input text-xs" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value as ActivityStatus | '' })}>
              <option value="">All statuses</option>
              {(Object.keys(STATUS_STYLES) as ActivityStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_STYLES[s].label}</option>
              ))}
            </select>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-[11px]">
            {(Object.entries(STATUS_STYLES) as [ActivityStatus, typeof STATUS_STYLES.planned][]).map(([key, st]) => (
              <span key={key} className="flex items-center gap-1.5 text-muted">
                <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                {st.label}
              </span>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20 text-muted">
              <Loader2 className="animate-spin" size={20} />
            </div>
          ) : (
            <>
              {view === 'month' && <MonthGrid />}
              {view === 'week' && <WeekGrid />}
              {view === 'day' && <DayView />}
              {view === 'agenda' && <AgendaView />}
            </>
          )}
        </div>

        {/* Right sidebar */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-white p-4">
            <h3 className="text-sm font-bold text-navy">Today&apos;s Activities</h3>
            <ul className="mt-3 space-y-2">
              {todayEvents.length === 0 ? (
                <li className="text-xs text-muted">Nothing scheduled today</li>
              ) : (
                todayEvents.map((ev) => (
                  <li key={ev.id}>
                    <button type="button" onClick={() => setSelected(ev)} className="w-full text-left">
                      <EventPill event={ev} />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-white p-4">
            <h3 className="text-sm font-bold text-navy">Upcoming Activities</h3>
            <ul className="mt-3 space-y-2">
              {upcomingEvents.length === 0 ? (
                <li className="text-xs text-muted">No upcoming items</li>
              ) : (
                upcomingEvents.map((ev) => (
                  <li key={ev.id}>
                    <button type="button" onClick={() => setSelected(ev)} className="w-full text-left">
                      <p className="truncate text-xs font-medium text-navy">{ev.title}</p>
                      <p className="text-[10px] text-muted">{format(ev.start, 'MMM d')} · {STATUS_STYLES[ev.status].label}</p>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          <Link href="/tasks" className="btn-primary w-full justify-center">
            <Plus size={14} />
            Add Activity
          </Link>
        </aside>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted capitalize">{selected.type}</p>
                <h3 className="mt-1 text-lg font-bold text-navy">{selected.title}</h3>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg p-1 text-muted hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Date</dt>
                <dd className="font-medium text-navy">{format(selected.start, 'PPP')}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Status</dt>
                <dd>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[selected.status].bg} ${STATUS_STYLES[selected.status].text}`}>
                    {STATUS_STYLES[selected.status].label}
                  </span>
                </dd>
              </div>
              {selected.planTitle && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Action Plan</dt>
                  <dd className="font-medium text-navy">{selected.planTitle}</dd>
                </div>
              )}
              {selected.owner && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Responsible</dt>
                  <dd className="font-medium text-navy">{selected.owner}</dd>
                </div>
              )}
              {selected.department && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Department</dt>
                  <dd className="font-medium text-navy">{selected.department}</dd>
                </div>
              )}
              {selected.taskId && (
                <p className="text-xs text-muted">Drag this activity on the calendar to reschedule its due date.</p>
              )}
            </dl>
            <div className="mt-6 flex gap-2">
              {selected.detailHref && (
                <Link href={selected.detailHref} className="btn-primary flex-1 justify-center">
                  Open Details
                </Link>
              )}
              <button type="button" onClick={() => setSelected(null)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </ApPageLayout>
  );
}
