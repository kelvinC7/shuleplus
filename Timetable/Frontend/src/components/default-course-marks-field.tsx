'use client';

import { GraduationCap } from 'lucide-react';

const PRESETS = [40, 50, 60, 100] as const;

type Props = {
  value: string;
  onChange: (next: string) => void;
  compact?: boolean;
  /** Shown under the field (Courses vs class assignment). */
  hint?: string;
};

/** Default total marks per course — used on Academic mid-term and term report cards. */
export function DefaultCourseMarksField({ value, onChange, compact, hint }: Props) {
  const trimmed = value.trim();
  const parsed = trimmed ? parseFloat(trimmed) : null;
  const invalid = trimmed.length > 0 && (!Number.isFinite(parsed!) || parsed! <= 0 || parsed! > 1000);

  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br from-slate-50/90 to-white ${
        invalid ? 'border-red-200' : 'border-border/70'
      } ${compact ? 'p-3' : 'p-4'}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy">
          <GraduationCap size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-navy">Default course marks</p>
          <p className="mt-0.5 text-xs text-muted">
            {hint ??
              'Total marks for this subject on student report cards (DEFAULT column and course totals).'}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((n) => {
          const active = trimmed === String(n);
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(String(n))}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold tabular-nums transition ${
                active
                  ? 'border-navy bg-navy text-primary shadow-sm'
                  : 'border-border bg-white text-navy hover:border-primary/40 hover:bg-primary/5'
              }`}
            >
              {n}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onChange('')}
          className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
            !trimmed
              ? 'border-slate-300 bg-slate-100 text-slate-600'
              : 'border-border bg-white text-muted hover:border-slate-300'
          }`}
        >
          Not set
        </button>
      </div>

      <label className="mt-3 block">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Custom value</span>
        <div className="mt-1.5 flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={1000}
            step={1}
            inputMode="numeric"
            placeholder="e.g. 40"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`input w-full max-w-[8rem] tabular-nums font-bold text-navy ${
              invalid ? 'border-red-300 ring-1 ring-red-200' : ''
            }`}
          />
          <span className="text-xs text-muted">out of this total per course</span>
        </div>
      </label>

      {invalid ? (
        <p className="mt-2 text-xs font-medium text-red-600">Enter a number from 1 to 1000, or choose Not set.</p>
      ) : null}
    </div>
  );
}

export function parseDefaultCourseMarksInput(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = parseFloat(t);
  if (!Number.isFinite(n) || n <= 0 || n > 1000) return null;
  return Math.round(n * 10) / 10;
}
