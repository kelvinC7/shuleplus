'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { timetableApi } from '@/services/timetable-api';
import type { TimetableConflict } from '@/types';

export type PlacementSlotRef = {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  periodLabel?: string;
};

type Suggestion = {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  periodLabel: string | null;
  score: number;
};

export function PlacementAdvisorPanel({
  className,
  subjectName,
  teacherUserId,
  teacherName,
  term,
  academicYear,
  room,
  targetSlot,
  onPickSlot,
  applying,
}: {
  className: string;
  subjectName: string;
  teacherUserId: string;
  teacherName: string;
  term: string;
  academicYear: string;
  room?: string;
  targetSlot: PlacementSlotRef;
  onPickSlot: (slot: PlacementSlotRef) => void | Promise<void>;
  applying?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [selectedOk, setSelectedOk] = useState<boolean | null>(null);
  const [conflicts, setConflicts] = useState<TimetableConflict[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!subjectName || !teacherUserId || !teacherName) {
      setSelectedOk(null);
      setConflicts([]);
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      void timetableApi
        .suggestPlacementSlots({
          className,
          subjectName,
          teacherUserId,
          teacherName,
          term,
          academicYear,
          room: room || undefined,
          dayOfWeek: targetSlot.dayOfWeek,
          startTime: targetSlot.startTime,
          endTime: targetSlot.endTime,
          limit: 10,
        })
        .then((res) => {
          if (cancelled) return;
          const data = res.data.data;
          setSelectedOk(data.selectedSlot.ok);
          setConflicts(data.selectedSlot.conflicts ?? []);
          setSuggestions(data.suggestions ?? []);
        })
        .catch(() => {
          if (!cancelled) setError('Availability check failed.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 320);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    className,
    subjectName,
    teacherUserId,
    teacherName,
    term,
    academicYear,
    room,
    targetSlot.dayOfWeek,
    targetSlot.startTime,
    targetSlot.endTime,
  ]);

  if (!subjectName || !teacherUserId) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 px-3 py-2">
        <p className="text-xs font-semibold text-navy">Availability</p>
        {loading ? <Loader2 size={14} className="animate-spin text-slate-400" /> : null}
      </div>

      <div className="space-y-2 p-3">
        {error ? <p className="text-xs text-red-600">{error}</p> : null}

        {selectedOk === true ? (
          <div className="flex gap-2 text-xs text-emerald-800">
            <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
            <p>This period is free for {teacherName}.</p>
          </div>
        ) : null}

        {selectedOk === false ? (
          <div className="flex gap-2 text-xs text-amber-950">
            <AlertTriangle size={14} className="shrink-0 text-amber-600" />
            <ul className="list-inside list-disc">
              {conflicts.slice(0, 2).map((c, i) => (
                <li key={i}>{c.message}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {suggestions.length > 0 ? (
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {selectedOk ? 'Other slots' : 'Free slots'}
            </p>
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {suggestions.map((s) => {
                const isSameAsTarget =
                  s.dayOfWeek === targetSlot.dayOfWeek &&
                  s.startTime === targetSlot.startTime &&
                  s.endTime === targetSlot.endTime;
                if (isSameAsTarget && selectedOk) return null;
                const prefix = s.periodLabel ? `${s.periodLabel}, ` : '';
                return (
                  <li key={`${s.dayOfWeek}-${s.startTime}`}>
                    <button
                      type="button"
                      disabled={applying}
                      onClick={() =>
                        void onPickSlot({
                          dayOfWeek: s.dayOfWeek,
                          startTime: s.startTime,
                          endTime: s.endTime,
                          periodLabel: s.periodLabel ?? undefined,
                        })
                      }
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left text-xs hover:border-slate-300 disabled:opacity-50"
                    >
                      <span className="text-navy">
                        {prefix}
                        {s.dayOfWeek} {s.startTime}-{s.endTime}
                      </span>
                      <span className="text-[10px] font-semibold text-primary">Use</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {!loading && selectedOk === false && suggestions.length === 0 ? (
          <p className="text-xs text-slate-500">No free slots for this teacher in {className}.</p>
        ) : null}
      </div>
    </div>
  );
}
