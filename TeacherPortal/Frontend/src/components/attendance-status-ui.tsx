'use client';

import {
  CalendarDays,
  Check,
  CircleDashed,
  Clock,
  ShieldCheck,
  Stethoscope,
  X,
  type LucideIcon,
} from 'lucide-react';

export interface AttendanceStatusMeta {
  value: string;
  label: string;
  icon: LucideIcon;
  tone: string;
  iconClass: string;
}

export const ATTENDANCE_STATUS_OPTIONS: AttendanceStatusMeta[] = [
  {
    value: 'PRESENT',
    label: 'Present',
    icon: Check,
    tone: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    iconClass: 'text-emerald-600',
  },
  {
    value: 'LATE',
    label: 'Late',
    icon: Clock,
    tone: 'bg-amber-100 text-amber-900 border-amber-300',
    iconClass: 'text-amber-600',
  },
  {
    value: 'ABSENT',
    label: 'Absent',
    icon: X,
    tone: 'bg-red-100 text-red-800 border-red-300',
    iconClass: 'text-red-600',
  },
  {
    value: 'EXCUSED',
    label: 'Excused',
    icon: ShieldCheck,
    tone: 'bg-sky-100 text-sky-800 border-sky-300',
    iconClass: 'text-sky-600',
  },
  {
    value: 'SICK',
    label: 'Medical',
    icon: Stethoscope,
    tone: 'bg-violet-100 text-violet-800 border-violet-300',
    iconClass: 'text-violet-600',
  },
  {
    value: 'SCHOOL_ACTIVITY',
    label: 'School Activity',
    icon: CalendarDays,
    tone: 'bg-slate-100 text-slate-700 border-slate-300',
    iconClass: 'text-slate-600',
  },
];

const FALLBACK_META: AttendanceStatusMeta = {
  value: 'UNMARKED',
  label: 'Unmarked',
  icon: CircleDashed,
  tone: 'bg-slate-50 text-slate-600 border-slate-200',
  iconClass: 'text-slate-400',
};

export function getAttendanceStatusMeta(status: string): AttendanceStatusMeta {
  return ATTENDANCE_STATUS_OPTIONS.find((s) => s.value === status) ?? FALLBACK_META;
}

export function AttendanceStatusIcon({
  status,
  className = 'h-3.5 w-3.5',
}: {
  status: string;
  className?: string;
}) {
  const { icon: Icon, iconClass } = getAttendanceStatusMeta(status);
  return <Icon className={`${className} ${iconClass}`} aria-hidden strokeWidth={2.5} />;
}

export function AttendanceStatusBadge({
  status,
  className = '',
  compact = false,
}: {
  status: string;
  className?: string;
  compact?: boolean;
}) {
  const meta = getAttendanceStatusMeta(status);
  if (compact) {
    return (
      <span
        className={`inline-flex max-w-full items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-semibold leading-tight ${meta.tone} ${className}`}
      >
        <AttendanceStatusIcon status={status} className="h-3 w-3 shrink-0" />
        <span className="truncate">{meta.label}</span>
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.tone} ${className}`}
    >
      <AttendanceStatusIcon status={status} />
      {meta.label}
    </span>
  );
}

export function AttendanceStatusButton({
  status,
  active,
  disabled,
  onClick,
  compact = false,
}: {
  status: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  const meta = getAttendanceStatusMeta(status);
  const Icon = meta.icon;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={meta.label}
      aria-label={meta.label}
      className={`inline-flex items-center gap-1.5 rounded-lg border font-semibold transition ${
        compact ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5 text-xs'
      } ${
        active
          ? meta.tone
          : 'border-border bg-white text-muted hover:border-slate-300 hover:bg-slate-50'
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <Icon
        className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} ${active ? '' : meta.iconClass}`}
        aria-hidden
        strokeWidth={2.5}
      />
      {!compact && <span>{meta.label}</span>}
    </button>
  );
}

export function AttendanceToolbarButton({
  status,
  disabled,
  onClick,
  label,
  variant = 'secondary',
}: {
  status: string;
  disabled?: boolean;
  onClick: () => void;
  label?: string;
  variant?: 'secondary' | 'primary';
}) {
  const meta = getAttendanceStatusMeta(status);
  const Icon = meta.icon;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
        variant === 'primary' ? 'btn-primary' : 'btn-secondary'
      }`}
    >
      <Icon className={`h-4 w-4 ${variant === 'primary' ? 'text-inherit' : meta.iconClass}`} aria-hidden strokeWidth={2.5} />
      {label ?? meta.label}
    </button>
  );
}

export function AttendanceStatLine({
  status,
  count,
}: {
  status: string;
  count: number;
}) {
  const meta = getAttendanceStatusMeta(status);
  const Icon = meta.icon;
  return (
    <p className={`flex items-center gap-2 ${meta.iconClass}`}>
      <Icon className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
      <span className="text-inherit">
        {meta.label} · {count}
      </span>
    </p>
  );
}
