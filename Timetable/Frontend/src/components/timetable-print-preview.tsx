'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { AlertTriangle, Check, Loader2, Printer, X } from 'lucide-react';
import type { CourseConfig, PeriodSlotDefinition, TimetableRow } from '@/types';
import { TimetableGrid } from '@/components/timetable-grid';
import { TimetableStreamMatrix } from '@/components/timetable-stream-matrix';

export interface TimetablePrintGroup {
  key: string;
  title: string;
  subtitle?: string;
  rows: TimetableRow[];
  showStream?: boolean;
  /** `stream-matrix` renders one class with all streams per day on one page. */
  layout?: 'grid' | 'stream-matrix';
  streams?: string[];
}

interface TimetablePrintPreviewProps {
  open: boolean;
  onClose: () => void;
  groups: TimetablePrintGroup[];
  periodSlots: PeriodSlotDefinition[];
  days: string[];
  courses?: CourseConfig[];
  schoolName?: string;
  term: string;
  academicYear: string;
  title: string;
  subtitle?: string;
  initialPaper?: 'A4' | 'A3';
}

type Paper = 'A4' | 'A3';
type Orientation = 'landscape' | 'portrait';

export function TimetablePrintPreview({
  open,
  onClose,
  groups,
  periodSlots,
  days,
  courses = [],
  schoolName,
  term,
  academicYear,
  title,
  subtitle,
  initialPaper = 'A4',
}: TimetablePrintPreviewProps) {
  const [paper, setPaper] = useState<Paper>(initialPaper);
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [fontOverride, setFontOverride] = useState<number | null>(null);
  const [onePerPage, setOnePerPage] = useState(true);
  const [logoOk, setLogoOk] = useState(true);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPaper(initialPaper);
    setOrientation('landscape');
    setFontOverride(null);
    setOnePerPage(true);
  }, [open, initialPaper]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const maxPeriods = Math.max(1, periodSlots.length);
  const maxDays = Math.max(1, days.length || 5);
  const maxStreamRows = Math.max(
    1,
    ...groups.map((group) =>
      group.layout === 'stream-matrix' ? Math.max(1, group.streams?.length ?? 1) : 1
    )
  );
  const bodyRows = maxDays * maxStreamRows;

  const autoFont = useMemo(() => {
    const base = paper === 'A3' ? 9.5 : 8;
    const periodPenalty = Math.max(0, maxPeriods - 10) * 0.32;
    const rowPenalty = Math.max(0, bodyRows - 8) * 0.14;
    const groupPenalty = groups.length > 1 ? 0.4 : 0;
    const portraitPenalty = orientation === 'portrait' ? 0.7 : 0;
    return Math.max(
      4.8,
      Math.min(base, base - periodPenalty - rowPenalty - groupPenalty - portraitPenalty)
    );
  }, [paper, orientation, maxPeriods, bodyRows, groups.length]);

  const fontSize = fontOverride ?? Math.round(autoFont * 10) / 10;
  const dense =
    fontSize < 6.5 || (paper === 'A4' && (maxPeriods >= 14 || maxDays >= 7 || bodyRows >= 24));

  const initials = useMemo(() => {
    const parts = (schoolName || 'Shule+').split(/\s+/).filter(Boolean);
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }, [schoolName]);

  if (!open) return null;

  const margin = paper === 'A4' ? 8 : 10;

  function handlePrint() {
    setPrinting(true);
    // Let the browser apply the page size/font changes before opening the dialog.
    window.setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 120);
  }

  return (
    <div className="timetable-print-overlay fixed inset-0 z-[90] flex flex-col bg-navy/60 backdrop-blur-sm">
      <style>{`@page { size: ${paper} ${orientation}; margin: ${margin}mm; }`}</style>

      <div className="flex items-center justify-between border-b border-border bg-white px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-navy">
            <Printer size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-navy">Print preview</h2>
            <p className="truncate text-xs text-muted">
              {title} · {term} · {academicYear}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-border p-2 text-muted transition hover:bg-slate-50 hover:text-navy"
          aria-label="Close print preview"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4 overflow-y-auto border-b border-border bg-white p-4 lg:border-b-0 lg:border-r sm:p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Paper size</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(['A4', 'A3'] as Paper[]).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    setPaper(size);
                    setFontOverride(null);
                  }}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                    paper === size
                      ? 'border-primary bg-primary/10 text-navy'
                      : 'border-border bg-white text-muted hover:border-slate-300'
                  }`}
                >
                  {size}
                  <span className="mt-0.5 block text-[10px] font-medium text-muted">
                    {size === 'A4' ? '210 × 297 mm' : '297 × 420 mm'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Orientation</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'landscape', label: 'Landscape' },
                  { id: 'portrait', label: 'Portrait' },
                ] as Array<{ id: Orientation; label: string }>
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setOrientation(option.id)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                    orientation === option.id
                      ? 'border-primary bg-primary/10 text-navy'
                      : 'border-border bg-white text-muted hover:border-slate-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Cell text</p>
              <button
                type="button"
                onClick={() => setFontOverride(null)}
                className="text-[11px] font-semibold text-ochre hover:underline"
              >
                Auto fit
              </button>
            </div>
            <input
              type="range"
              min={5}
              max={12}
              step={0.5}
              value={fontSize}
              onChange={(event) => setFontOverride(Number(event.target.value))}
              className="mt-2 w-full accent-[#fcb038]"
              aria-label="Print cell text size"
            />
            <p className="mt-1 text-xs text-muted">
              {fontSize.toFixed(1)} px {fontOverride == null ? '(auto)' : '(manual)'}
            </p>
          </div>

          {groups.length > 1 ? (
            <label className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm text-navy">
              <input
                type="checkbox"
                checked={onePerPage}
                onChange={(event) => setOnePerPage(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
              />
              <span>
                Start each stream on a new page
                <span className="mt-0.5 block text-[11px] text-muted">
                  Avoids splitting a stream across pages.
                </span>
              </span>
            </label>
          ) : null}

          {dense ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle size={14} /> Text may be too small
              </p>
              <p className="mt-1 leading-relaxed">
                This timetable has {maxPeriods} periods across {maxDays} day
                {maxDays === 1 ? '' : 's'}
                {maxStreamRows > 1 ? ` and ${maxStreamRows} streams per day` : ''}. Use A3 or print
                one stream at a time for a more readable result.
              </p>
              {paper === 'A4' ? (
                <button
                  type="button"
                  onClick={() => {
                    setPaper('A3');
                    setFontOverride(null);
                  }}
                  className="mt-2 rounded-lg bg-amber-700 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-800"
                >
                  Switch to A3
                </button>
              ) : null}
            </div>
          ) : (
            <p className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
              <Check size={14} /> Layout fits {paper} {orientation}.
            </p>
          )}

          <div className="rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
            <p className="font-semibold text-navy">{groups.length} timetable{groups.length === 1 ? '' : 's'}</p>
            <p className="mt-1">
              {maxPeriods} period columns · {maxDays} day rows
              {maxStreamRows > 1 ? ` × ${maxStreamRows} streams` : ''}
            </p>
            <p className="mt-2">
              In the browser print dialog choose <strong>{paper} {orientation}</strong>, margins
              Default, and enable <strong>Background graphics</strong>.
            </p>
          </div>
        </aside>

        <div className="min-h-0 overflow-auto bg-slate-100 p-4 sm:p-6">
          <div className="mx-auto max-w-6xl space-y-4">
            {groups.map((group) => (
              <section key={group.key} className="hr-card overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-slate-50 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy">{group.title}</p>
                    {group.subtitle ? (
                      <p className="truncate text-[11px] text-muted">{group.subtitle}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold text-muted ring-1 ring-border">
                    {group.rows.length} lessons
                  </span>
                </div>
                <div className="overflow-x-auto p-2">
                  {group.layout === 'stream-matrix' ? (
                    <TimetableStreamMatrix
                      rows={group.rows}
                      streams={group.streams ?? []}
                      periodSlots={periodSlots}
                      days={days}
                      courses={courses}
                      mode="screen"
                      compact
                    />
                  ) : (
                    <TimetableGrid
                      rows={group.rows}
                      periodSlots={periodSlots}
                      days={days}
                      courses={courses}
                      showStream={group.showStream}
                      mode="screen"
                      compact
                    />
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-white px-4 py-3 sm:px-6">
        <p className="text-xs text-muted">
          Only the timetable content is printed — navigation and filters stay on screen.
        </p>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary py-2.5" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary py-2.5" onClick={handlePrint} disabled={printing}>
            {printing ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
            Print {paper} {orientation === 'landscape' ? 'landscape' : 'portrait'}
          </button>
        </div>
      </div>

      {/* Hidden on screen; this is the only content shown by the print stylesheet. */}
      {typeof document !== 'undefined'
        ? createPortal(
            <div className="timetable-print-root">
        <header className="timetable-print-header">
          <div className="timetable-print-brand">
            {logoOk ? (
              <Image
                src="/logo.png"
                alt=""
                width={150}
                height={46}
                className="timetable-print-logo"
                onError={() => setLogoOk(false)}
              />
            ) : null}
            {!logoOk ? <span className="timetable-print-initials">{initials}</span> : null}
            <div>
              <p className="timetable-print-school">{schoolName || 'School Timetable'}</p>
              <p className="timetable-print-doctitle">{title}</p>
            </div>
          </div>
          <div className="timetable-print-meta">
            <p>
              <strong>{term}</strong> · {academicYear}
            </p>
            {subtitle ? <p>{subtitle}</p> : null}
            <p>Generated {new Date().toLocaleDateString()}</p>
          </div>
        </header>

        {groups.map((group, index) => (
          <section
            key={group.key}
            className={`timetable-print-group ${
              onePerPage && index > 0 ? 'timetable-print-group-pagebreak' : ''
            }`}
          >
            <div className="timetable-print-grouptitle">
              <span>{group.title}</span>
              {group.subtitle ? <span className="timetable-print-groupsub">{group.subtitle}</span> : null}
            </div>
            {group.layout === 'stream-matrix' ? (
              <TimetableStreamMatrix
                rows={group.rows}
                streams={group.streams ?? []}
                periodSlots={periodSlots}
                days={days}
                courses={courses}
                mode="print"
                printFontSize={fontSize}
              />
            ) : (
              <TimetableGrid
                rows={group.rows}
                periodSlots={periodSlots}
                days={days}
                courses={courses}
                showStream={group.showStream}
                mode="print"
                printFontSize={fontSize}
              />
            )}
          </section>
        ))}

        <footer className="timetable-print-footer">
          <span>{schoolName || 'Shule+'} · {term} {academicYear}</span>
          <span>Prepared from the school timetable records</span>
        </footer>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
