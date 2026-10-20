import type { LiveRoomStatus } from '@/services/timetable-api';

export function liveStatusLabel(status: LiveRoomStatus | string) {
  switch (status) {
    case 'ON_TIME':
      return 'On Time';
    case 'LATE':
      return 'Late';
    case 'MISSING':
    case 'NOT_CHECKED_IN':
      return 'Not Checked In';
    case 'UPCOMING':
      return 'Upcoming';
    case 'COMPLETED':
      return 'Completed';
    case 'FREE':
      return 'Free';
    default:
      return status.replace(/_/g, ' ');
  }
}

export function liveStatusDot(status: LiveRoomStatus | string) {
  switch (status) {
    case 'ON_TIME':
      return 'bg-emerald-500';
    case 'LATE':
      return 'bg-amber-500';
    case 'MISSING':
    case 'NOT_CHECKED_IN':
      return 'bg-red-500';
    case 'UPCOMING':
      return 'bg-slate-300';
    case 'COMPLETED':
      return 'bg-sky-500';
    case 'FREE':
      return 'bg-slate-200';
    default:
      return 'bg-slate-400';
  }
}

export function liveStatusCard(status: LiveRoomStatus | string) {
  switch (status) {
    case 'ON_TIME':
      return 'border-emerald-200 bg-emerald-50/80 text-emerald-950 ring-emerald-400/30';
    case 'LATE':
      return 'border-amber-200 bg-amber-50/80 text-amber-950 ring-amber-400/30';
    case 'MISSING':
    case 'NOT_CHECKED_IN':
      return 'border-red-200 bg-red-50/80 text-red-950 ring-red-400/30';
    case 'UPCOMING':
      return 'border-slate-200 bg-slate-50/80 text-slate-700 ring-slate-300/30';
    case 'COMPLETED':
      return 'border-sky-200 bg-sky-50/80 text-sky-950 ring-sky-400/30';
    case 'FREE':
      return 'border-slate-100 bg-white text-slate-500 ring-slate-200/40';
    default:
      return 'border-border bg-white text-navy';
  }
}

export function liveStatusBadge(status: LiveRoomStatus | string) {
  switch (status) {
    case 'ON_TIME':
      return 'bg-emerald-100 text-emerald-800';
    case 'LATE':
      return 'bg-amber-100 text-amber-800';
    case 'MISSING':
    case 'NOT_CHECKED_IN':
      return 'bg-red-100 text-red-800';
    case 'UPCOMING':
      return 'bg-slate-100 text-slate-600';
    case 'COMPLETED':
      return 'bg-sky-100 text-sky-800';
    case 'FREE':
      return 'bg-slate-50 text-slate-500';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export function formatClockTime(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDurationMinutes(mins: number | null | undefined) {
  if (mins == null) return '—';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
