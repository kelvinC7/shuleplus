'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Bell, MapPin, Repeat2, X } from 'lucide-react';
import { usePeriodNotifications } from '@/hooks/use-period-notifications';
import type { PeriodAlertPayload } from '@/utils/period-alerts';
import { actionLabel, thresholdHeadline } from '@/utils/period-alerts';

export function PeriodTransitionBanner({
  alert,
  onDismiss,
}: {
  alert: PeriodAlertPayload;
  onDismiss: () => void;
}) {
  const [alertHint, setAlertHint] = useState<string | null>(null);
  const { threshold, minutesRemaining, current, next, transition } = alert;
  const urgent = threshold === 0 || minutesRemaining <= 0;
  const soon = threshold === 2 || minutesRemaining <= 2;
  const isDouble = transition.nextAction === 'double_continue';

  const shellClass = urgent
    ? 'border-red-300 bg-red-50 text-red-950'
    : soon
      ? 'border-amber-300 bg-amber-50 text-amber-950'
      : isDouble
        ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
        : 'border-sky-300 bg-sky-50 text-sky-950';

  const iconClass = urgent
    ? 'bg-red-500 text-white'
    : soon
      ? 'bg-amber-500 text-white'
      : isDouble
        ? 'bg-emerald-500 text-white'
        : 'bg-sky-500 text-white';

  return (
    <div
      className={`pointer-events-auto fixed inset-x-4 top-[4.5rem] z-[60] mx-auto max-w-2xl rounded-2xl border p-4 shadow-lg backdrop-blur-sm sm:inset-x-auto sm:right-6 sm:left-auto sm:top-20 ${shellClass}`}
      role="status"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
          {isDouble ? <Repeat2 className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold">{thresholdHeadline(threshold, minutesRemaining)}</p>
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
              {actionLabel(transition.nextAction)}
            </span>
          </div>

          <p className="mt-1 text-sm font-semibold">
            {current.subjectName} · {current.className}
            {current.room ? ` · ${current.room}` : ''}
          </p>

          <p className="mt-1 text-sm opacity-90">{transition.message}</p>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href="/classroom-scan"
              className="inline-flex items-center justify-center rounded-lg bg-navy px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-white hover:bg-navy/90"
            >
              Scan class monitor QRCode
            </Link>
            <Link
              href="/attendance"
              className="inline-flex items-center justify-center rounded-lg border border-current/20 bg-white/60 px-3 py-2 text-[11px] font-bold uppercase tracking-wide hover:bg-white/80"
            >
              Mark attendance
            </Link>
            {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' ? (
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-amber-400/50 bg-amber-50 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-amber-950 hover:bg-amber-100"
                onClick={() => {
                  void Notification.requestPermission().then((p) => {
                    setAlertHint(
                      p === 'granted'
                        ? 'Browser alerts enabled for period reminders.'
                        : 'Allow notifications in browser settings to get reminders when the tab is in the background.'
                    );
                  });
                }}
              >
                Enable alert notifications
              </button>
            ) : null}
          </div>
          {alertHint ? <p className="mt-2 text-xs opacity-80">{alertHint}</p> : null}

          {transition.nextAction === 'move' && next ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {next.room?.trim() || next.className} at {next.startTime}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg p-1.5 opacity-70 transition hover:bg-white/60 hover:opacity-100"
          aria-label="Dismiss period notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function PeriodNotifications() {
  const { activeAlert, dismissAlert } = usePeriodNotifications(true);
  if (!activeAlert) return null;
  return <PeriodTransitionBanner alert={activeAlert} onDismiss={dismissAlert} />;
}
