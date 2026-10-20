'use client';

import {
  AlertTriangle,
  Clock,
  Loader2,
  LogIn,
  LogOut,
  Radio,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PersonAvatar } from '@/components/attendance-ui';
import type { AttendanceRecord, AttendanceTimelineEvent } from '@/services/attendance-api';
import { formatAttendanceTime, formatDurationMins } from '@/utils/format-attendance-time';
import { AttendanceStatusIndicators } from './attendance-status-indicators';

const TIMELINE_META: Record<
  string,
  { icon: LucideIcon; ring: string; bg: string; iconClass: string }
> = {
  ARRIVAL: {
    icon: LogIn,
    ring: 'ring-emerald-500/30',
    bg: 'bg-emerald-50',
    iconClass: 'text-emerald-600',
  },
  DEPARTURE: {
    icon: LogOut,
    ring: 'ring-slate-400/30',
    bg: 'bg-slate-100',
    iconClass: 'text-slate-600',
  },
  LATE: {
    icon: Clock,
    ring: 'ring-amber-500/30',
    bg: 'bg-amber-50',
    iconClass: 'text-amber-600',
  },
  SCAN: {
    icon: Radio,
    ring: 'ring-sky-500/30',
    bg: 'bg-sky-50',
    iconClass: 'text-sky-600',
  },
  WARNING: {
    icon: AlertTriangle,
    ring: 'ring-amber-500/30',
    bg: 'bg-amber-50',
    iconClass: 'text-amber-700',
  },
  CORRECTION: {
    icon: Sparkles,
    ring: 'ring-violet-500/30',
    bg: 'bg-violet-50',
    iconClass: 'text-violet-600',
  },
  ALERT: {
    icon: ShieldAlert,
    ring: 'ring-rose-500/30',
    bg: 'bg-rose-50',
    iconClass: 'text-rose-600',
  },
};

function formatTimelineWhen(iso: string) {
  const d = new Date(iso);
  return {
    time: d.toLocaleTimeString('en-GB', {
      timeZone: 'Africa/Kigali',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }),
    date: d.toLocaleDateString('en-GB', {
      timeZone: 'Africa/Kigali',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }),
  };
}

export function AttendanceProfileDrawer({
  open,
  record,
  timeline,
  loading,
  onClose,
}: {
  open: boolean;
  record: AttendanceRecord | null;
  timeline: AttendanceTimelineEvent[];
  loading: boolean;
  onClose: () => void;
}) {
  if (!open || !record) return null;

  const personKind = record.personType ?? (record.level?.startsWith('STAFF:') ? 'STAFF' : 'STUDENT');

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-navy/35 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl animate-slide-in-right">
        <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#000435] via-[#0a1054] to-[#000435] px-5 py-6 text-white sm:px-6">
          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[#FCB038]/10 blur-2xl" />
          <div className="relative flex items-start gap-4">
            <PersonAvatar
              name={record.studentName}
              photoUrl={record.photoUrl}
              personKind={personKind}
              size={72}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FCB038]">
                Attendance timeline
              </p>
              <h2 className="truncate text-lg font-bold sm:text-xl">{record.studentName}</h2>
              <p className="mt-0.5 font-mono text-xs text-white/70">
                {record.studentCode ?? '—'} · {record.lessonDate}
              </p>
              <div className="mt-3">
                <AttendanceStatusIndicators
                  attendanceStatus={record.attendanceStatus ?? record.display?.attendanceStatus}
                  punctuality={record.punctuality ?? record.display?.punctuality}
                  checkoutStatus={record.checkoutStatus ?? record.display?.checkoutStatus}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full bg-white/10 p-2 hover:bg-white/20"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px border-b border-border bg-border sm:grid-cols-4">
          {(
            [
              { label: 'Check-in', value: formatAttendanceTime(record.entryTime) },
              { label: 'Check-out', value: formatAttendanceTime(record.exitTime) },
              { label: 'Duration', value: formatDurationMins(record.durationMins) },
              { label: 'Expected', value: record.expectedArrival ?? '—' },
            ] as const
          ).map((stat) => (
            <div key={stat.label} className="bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{stat.label}</p>
              <p className="mt-1 font-mono text-sm font-semibold text-navy">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wide text-muted">Scan & event history</h3>
          {loading ? (
            <div className="flex items-center gap-2 py-12 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading timeline…
            </div>
          ) : timeline.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-slate-50/80 py-10 text-center text-sm text-muted">
              No timeline events for this record.
            </p>
          ) : (
            <ol className="space-y-0">
              {timeline.map((ev, index) => {
                const meta = TIMELINE_META[ev.kind] ?? TIMELINE_META.SCAN;
                const Icon = meta.icon;
                const when = formatTimelineWhen(ev.at);
                const isLast = index === timeline.length - 1;
                return (
                  <li key={ev.id} className="relative flex gap-4 pb-6 last:pb-0">
                    {!isLast ? (
                      <span
                        className="absolute left-[19px] top-10 bottom-0 w-px bg-gradient-to-b from-border via-border/60 to-transparent"
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className={`relative z-[1] flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-4 ring-white ${meta.bg} ${meta.ring}`}
                    >
                      <Icon className={`h-4 w-4 ${meta.iconClass}`} />
                    </span>
                    <div className="min-w-0 flex-1 rounded-2xl border border-border/80 bg-white p-3.5 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-navy">{ev.label}</p>
                        <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-muted">
                          {when.time}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted">{when.date}</p>
                      {ev.detail ? (
                        <p className="mt-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-navy/80">{ev.detail}</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </aside>
      <style jsx global>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}
