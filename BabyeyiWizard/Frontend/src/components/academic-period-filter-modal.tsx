'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, X } from 'lucide-react';
import { useAcademicPeriod } from '@/contexts/academic-period-context';

interface AcademicPeriodFilterModalProps {
  open: boolean;
  onClose: () => void;
}

export function AcademicPeriodFilterModal({ open, onClose }: AcademicPeriodFilterModalProps) {
  const { settings, loading, year, term, setYear, setTerm } = useAcademicPeriod();
  const [draftYear, setDraftYear] = useState(year);
  const [draftTerm, setDraftTerm] = useState(term);

  useEffect(() => {
    if (!open) return;
    setDraftYear(year);
    setDraftTerm(term);
  }, [open, year, term]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function apply() {
    setYear(draftYear);
    setTerm(draftTerm);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-navy/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="period-filter-title"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <CalendarClock size={18} />
            </span>
            <div>
              <h3 id="period-filter-title" className="text-base font-bold text-navy">
                Filter period
              </h3>
              <p className="mt-0.5 text-xs text-muted">
                Choose academic year and term for cards and charts on this page.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted transition hover:bg-slate-100 hover:text-navy"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-muted">
              Academic year
            </span>
            <select
              value={draftYear}
              disabled={loading}
              onChange={(e) => setDraftYear(e.target.value)}
              className="input w-full"
            >
              {settings.academicYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-muted">Term</span>
            <select
              value={draftTerm}
              disabled={loading}
              onChange={(e) => setDraftTerm(e.target.value)}
              className="input w-full"
            >
              {settings.terms.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          {year && term ? (
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-muted">
              Currently showing{' '}
              <span className="font-semibold text-navy">
                {year} · {term}
              </span>
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-border bg-slate-50/80 px-5 py-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={apply} disabled={loading || !draftYear || !draftTerm} className="btn-primary">
            Apply filter
          </button>
        </div>
      </div>
    </div>
  );
}
