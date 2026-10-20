'use client';

import { AlertCircle, Check, Circle, Clock, MapPinOff, X } from 'lucide-react';
import type { SmartLesson } from '@/types/smart-timetable';

export function punctualityLabel(punctuality: string, minutesLate?: number) {
  switch (punctuality) {
    case 'ON_TIME':
      return 'On Time';
    case 'EARLY':
      return 'Early';
    case 'LATE':
      return minutesLate ? `${minutesLate} min Late` : 'Late';
    case 'VERY_LATE':
      return minutesLate ? `${minutesLate} min Late` : 'Very Late';
    case 'WRONG_CLASSROOM':
      return 'Wrong Classroom';
    case 'MISSED':
      return 'Missed';
    case 'NOT_STARTED':
    default:
      return 'Not Checked In';
  }
}

export function CheckInStatusPill({
  lesson,
  minutesLate,
  className = '',
}: {
  lesson: SmartLesson;
  minutesLate?: number;
  className?: string;
}) {
  const checkedIn = lesson.qrVerified || Boolean(lesson.scannedAt);
  const meta = getCheckInMeta(lesson, checkedIn, minutesLate);

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-tight sm:text-xs ${meta.tone} ${className}`}
    >
      <meta.icon className="h-3 w-3 shrink-0" strokeWidth={2.5} />
      <span className="truncate">{meta.label}</span>
    </span>
  );
}

function getCheckInMeta(lesson: SmartLesson, checkedIn: boolean, minutesLate?: number) {
  if (lesson.phase === 'upcoming') {
    return {
      label: 'Upcoming',
      tone: 'border-slate-200 bg-slate-50 text-slate-600',
      icon: Clock,
    };
  }

  if (lesson.phase === 'past' && !checkedIn) {
    return {
      label: 'Not Checked In',
      tone: 'border-red-200 bg-red-50 text-red-800',
      icon: X,
    };
  }

  if (lesson.phase === 'current' && !checkedIn) {
    return {
      label: 'Not Checked In',
      tone: 'border-amber-200 bg-amber-50 text-amber-900',
      icon: AlertCircle,
    };
  }

  if (lesson.punctuality === 'WRONG_CLASSROOM') {
    return {
      label: 'Wrong Room',
      tone: 'border-red-200 bg-red-50 text-red-800',
      icon: MapPinOff,
    };
  }

  if (lesson.punctuality === 'LATE' || lesson.punctuality === 'VERY_LATE') {
    return {
      label: punctualityLabel(lesson.punctuality, minutesLate),
      tone: 'border-amber-200 bg-amber-50 text-amber-900',
      icon: Clock,
    };
  }

  if (checkedIn || lesson.punctuality === 'ON_TIME' || lesson.punctuality === 'EARLY') {
    return {
      label: punctualityLabel(lesson.punctuality || 'ON_TIME', minutesLate),
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      icon: Check,
    };
  }

  if (lesson.phase === 'past' && lesson.lessonStatus === 'COMPLETED') {
    return {
      label: 'Completed',
      tone: 'border-sky-200 bg-sky-50 text-sky-800',
      icon: Check,
    };
  }

  return {
    label: 'Pending',
    tone: 'border-slate-200 bg-slate-50 text-slate-600',
    icon: Circle,
  };
}

export function PunctualityBanner({
  punctuality,
  minutesLate,
  checkedInAt,
}: {
  punctuality: string;
  minutesLate?: number;
  checkedInAt?: string | null;
}) {
  const isLate = punctuality === 'LATE' || punctuality === 'VERY_LATE';
  const isOk = punctuality === 'ON_TIME' || punctuality === 'EARLY';

  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        isOk
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : isLate
            ? 'border-amber-200 bg-amber-50 text-amber-900'
            : 'border-slate-200 bg-slate-50 text-slate-800'
      }`}
    >
      <p className="text-sm font-bold uppercase tracking-wide">
        {punctualityLabel(punctuality, minutesLate)}
      </p>
      {checkedInAt ? (
        <p className="mt-1 text-sm opacity-90">
          Checked in at {new Date(checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {isLate && minutesLate ? ` · ${minutesLate} min after period start` : ''}
        </p>
      ) : null}
    </div>
  );
}
