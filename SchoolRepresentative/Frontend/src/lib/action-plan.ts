import type { MeetingItem, TaskItem } from '@/types';

/* ───────────── dates ───────────── */

const pad = (n: number) => String(n).padStart(2, '0');

/** Local YYYY-MM-DD for a Date. */
export function toDayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(): string {
  return toDayKey(new Date());
}

/** Calendar day (YYYY-MM-DD) of an API date; date-only strings are not shifted by timezone. */
export function dayKeyOf(iso: string | null | undefined): string {
  if (!iso) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso.slice(0, 10);
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : toDayKey(d);
}

export function dateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/** Next given weekday (0 = Sun … 6 = Sat), always in the future. */
export function nextWeekday(weekday: number, from = new Date()): Date {
  const diff = ((weekday - from.getDay() + 7) % 7) || 7;
  return addDays(from, diff);
}

export function endOfMonth(from = new Date()): Date {
  return new Date(from.getFullYear(), from.getMonth() + 1, 0);
}

export function relativeDayLabel(key: string): string {
  if (!key) return '';
  const t = todayKey();
  if (key === t) return 'Today';
  if (key === toDayKey(addDays(new Date(), 1))) return 'Tomorrow';
  if (key === toDayKey(addDays(new Date(), -1))) return 'Yesterday';
  return dateFromKey(key).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

export const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : '');

export function timeRange(m: Pick<MeetingItem, 'startTime' | 'endTime'>): string {
  const s = hhmm(m.startTime);
  const e = hhmm(m.endTime);
  if (!s) return 'Time not set';
  return e ? `${s} – ${e}` : s;
}

/* ───────────── tasks ───────────── */

export type TaskState = 'open' | 'progress' | 'done';

export function taskState(t: Pick<TaskItem, 'status'>): TaskState {
  const s = (t.status ?? '').toLowerCase().replace(/[\s-]+/g, '_');
  if (s === 'completed' || s === 'done' || s === 'closed') return 'done';
  if (s === 'in_progress' || s === 'inprogress' || s === 'started') return 'progress';
  return 'open';
}

export function isOverdue(t: Pick<TaskItem, 'status' | 'dueDate'>): boolean {
  if (taskState(t) === 'done') return false;
  const due = dayKeyOf(t.dueDate);
  return Boolean(due) && due < todayKey();
}

export const TASK_STATE_API: Record<TaskState, string> = {
  open: 'open',
  progress: 'in_progress',
  done: 'completed',
};

const PRIORITY_RANK: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

/** Overdue first, then not-done by due date, then done last. */
export function sortTasks(rows: TaskItem[]): TaskItem[] {
  return [...rows].sort((a, b) => {
    const da = taskState(a) === 'done' ? 1 : 0;
    const db = taskState(b) === 'done' ? 1 : 0;
    if (da !== db) return da - db;
    const oa = isOverdue(a) ? 0 : 1;
    const ob = isOverdue(b) ? 0 : 1;
    if (oa !== ob) return oa - ob;
    const dueA = dayKeyOf(a.dueDate) || '9999';
    const dueB = dayKeyOf(b.dueDate) || '9999';
    if (dueA !== dueB) return dueA < dueB ? -1 : 1;
    return (PRIORITY_RANK[a.priority?.toUpperCase()] ?? 3) - (PRIORITY_RANK[b.priority?.toUpperCase()] ?? 3);
  });
}

/* ───────────── meetings ───────────── */

export function isUpcoming(m: Pick<MeetingItem, 'status' | 'meetingDate'>): boolean {
  return m.status === 'SCHEDULED' && dayKeyOf(m.meetingDate) >= todayKey();
}

export function inviteText(m: MeetingItem): string {
  const key = dayKeyOf(m.meetingDate);
  const when = key
    ? dateFromKey(key).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const lines = [m.title, '', `When: ${when}${m.startTime ? `, ${timeRange(m)}` : ''}`];
  if (m.location) lines.push(`Where: ${m.location}`);
  if (m.participants.length) lines.push(`Who: ${m.participants.join(', ')}`);
  if (m.agenda.length) {
    lines.push('', 'Agenda:');
    m.agenda.forEach((a, i) => lines.push(`${i + 1}. ${a}`));
  }
  if (m.description) lines.push('', m.description);
  return lines.join('\n');
}

const icsEscape = (v: string) => v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

/** Minimal iCalendar file for one meeting (floating local time, or all-day when no time is set). */
export function buildIcs(m: MeetingItem): string {
  const key = dayKeyOf(m.meetingDate).replace(/-/g, '');
  const start = hhmm(m.startTime).replace(':', '');
  const end = hhmm(m.endTime).replace(':', '');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Shule+ Director Console//EN', 'BEGIN:VEVENT', `UID:${m.id}@shule-plus`, `DTSTAMP:${stamp}`];
  if (start) {
    lines.push(`DTSTART:${key}T${start}00`);
    lines.push(`DTEND:${key}T${(end || start)}00`);
  } else {
    const next = toDayKey(addDays(dateFromKey(dayKeyOf(m.meetingDate)), 1)).replace(/-/g, '');
    lines.push(`DTSTART;VALUE=DATE:${key}`, `DTEND;VALUE=DATE:${next}`);
  }
  lines.push(`SUMMARY:${icsEscape(m.title)}`);
  if (m.location) lines.push(`LOCATION:${icsEscape(m.location)}`);
  const desc = [m.agenda.length ? `Agenda:\n${m.agenda.map((a, i) => `${i + 1}. ${a}`).join('\n')}` : '', m.description ?? ''].filter(Boolean).join('\n\n');
  if (desc) lines.push(`DESCRIPTION:${icsEscape(desc)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadTextFile(filename: string, content: string, mime = 'text/calendar') {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function splitList(value: string, separator: RegExp): string[] {
  return value
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}
