'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  CalendarDays,
  CalendarRange,
  Download,
  Filter,
  GraduationCap,
  RotateCcw,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import type { AcademicSettings } from '@/lib/academic-settings';

export interface ReportFilterValues {
  academicYear: string;
  term: string;
  /** ISO week, e.g. `2026-W45`. */
  week: string;
  /** Specific calendar day, `YYYY-MM-DD`. */
  date: string;
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_REPORT_FILTERS: ReportFilterValues = {
  academicYear: '',
  term: '',
  week: '',
  date: '',
  dateFrom: '',
  dateTo: '',
};

export function countActiveReportFilters(values: ReportFilterValues): number {
  return [
    values.academicYear,
    values.term,
    values.week,
    values.date,
    values.dateFrom || values.dateTo,
  ].filter(Boolean).length;
}

export function hasTimeFilter(values: ReportFilterValues): boolean {
  return Boolean(values.week || values.date || values.dateFrom || values.dateTo);
}

/** Maps the drawer values to the query string accepted by the module API. */
export function reportFilterParams(
  values: ReportFilterValues,
): Record<string, string> {
  const params: Record<string, string> = {};
  if (values.academicYear) params.academicYear = values.academicYear;
  if (values.term) params.term = values.term;

  // Week, specific day and range are mutually exclusive. Week wins, then day,
  // then the range — matching the backend resolution order.
  if (values.week) params.week = values.week;
  else if (values.date) params.date = values.date;
  else {
    if (values.dateFrom) params.dateFrom = values.dateFrom;
    if (values.dateTo) params.dateTo = values.dateTo;
  }

  return params;
}

function formatDay(value: string): string {
  if (!value) return '';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatWeek(value: string): string {
  const match = /^(\d{4})-W(\d{1,2})$/.exec(value);
  if (!match) return value;
  return `Week ${Number(match[2])}, ${match[1]}`;
}

/** Human-readable period summary used in the exported report header. */
export function reportPeriodMeta(
  values: ReportFilterValues,
): { label: string; value: string }[] {
  const meta: { label: string; value: string }[] = [];
  if (values.academicYear) meta.push({ label: 'Academic year', value: values.academicYear });
  if (values.term) meta.push({ label: 'Term', value: values.term });
  if (values.week) meta.push({ label: 'Week', value: formatWeek(values.week) });
  else if (values.date) meta.push({ label: 'Date', value: formatDay(values.date) });
  else if (values.dateFrom || values.dateTo) {
    const from = values.dateFrom ? formatDay(values.dateFrom) : 'Beginning';
    const to = values.dateTo ? formatDay(values.dateTo) : 'Today';
    meta.push({ label: 'Date range', value: `${from} – ${to}` });
  }
  return meta;
}

export function reportPeriodLabel(values: ReportFilterValues): string {
  const meta = reportPeriodMeta(values);
  if (meta.length === 0) return 'All records';
  return meta.map((item) => item.value).join(' · ');
}

interface ReportFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  academicSettings: AcademicSettings;
  value: ReportFilterValues;
  onApply: (values: ReportFilterValues) => void;
  onReset?: () => void;
  onDownload: (values: ReportFilterValues) => void | Promise<void>;
  downloading?: boolean;
  children?: ReactNode;
}

export function ReportFilterDrawer({
  open,
  onClose,
  title = 'Filter & export',
  description = 'Narrow records by academic period or date, then download a branded PDF report.',
  academicSettings,
  value,
  onApply,
  onReset,
  onDownload,
  downloading = false,
  children,
}: ReportFilterDrawerProps) {
  const [draft, setDraft] = useState<ReportFilterValues>(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const activeCount = countActiveReportFilters(draft);

  const set = (patch: Partial<ReportFilterValues>) =>
    setDraft((current) => ({ ...current, ...patch }));

  const apply = () => {
    onApply(draft);
    onClose();
  };

  const download = async () => {
    await onDownload(draft);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="!w-full !max-w-full gap-0 overflow-hidden border-l border-border p-0 sm:!w-[440px] sm:!max-w-[440px]"
      >
        <SheetHeader className="shrink-0 border-b border-white/10 bg-navy px-5 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#fcb038]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#fcb038]">
                <Filter className="h-3 w-3" />
                Filters
                {activeCount > 0 ? (
                  <span className="rounded-full bg-[#fcb038] px-1.5 text-[9px] font-extrabold text-navy">
                    {activeCount}
                  </span>
                ) : null}
              </div>
              <SheetTitle className="text-lg font-bold text-white">{title}</SheetTitle>
              <SheetDescription className="mt-1 text-xs leading-relaxed text-white/65">
                {description}
              </SheetDescription>
            </div>
            <button
              type="button"
              aria-label="Close filters"
              onClick={onClose}
              className="shrink-0 rounded-xl p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-[#f8fafc] px-5 py-5">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy text-[#fcb038]">
                <GraduationCap className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-navy">
                  Academic period
                </p>
                <p className="text-[11px] text-muted">School year and term.</p>
              </div>
            </div>

            <div className="grid gap-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Academic year
                </span>
                <select
                  className="input !rounded-xl !py-2.5 text-sm"
                  value={draft.academicYear}
                  onChange={(event) => set({ academicYear: event.target.value })}
                >
                  <option value="">All academic years</option>
                  {academicSettings.academicYears.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Term
                </span>
                <select
                  className="input !rounded-xl !py-2.5 text-sm"
                  value={draft.term}
                  onChange={(event) => set({ term: event.target.value })}
                >
                  <option value="">All terms</option>
                  {academicSettings.terms.map((term) => (
                    <option key={term} value={term}>{term}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy text-[#fcb038]">
                <CalendarRange className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-navy">
                  Time period
                </p>
                <p className="text-[11px] text-muted">
                  Choose a week, a specific day, or a range.
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Week
                </span>
                <input
                  type="week"
                  className="input !rounded-xl !py-2.5 text-sm"
                  value={draft.week}
                  onChange={(event) => set({ week: event.target.value, date: '', dateFrom: '', dateTo: '' })}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Specific date
                </span>
                <input
                  type="date"
                  className="input !rounded-xl !py-2.5 text-sm"
                  value={draft.date}
                  onChange={(event) => set({ date: event.target.value, week: '', dateFrom: '', dateTo: '' })}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <CalendarDays className="h-3 w-3" /> From
                  </span>
                  <input
                    type="date"
                    className="input !rounded-xl !py-2.5 text-sm"
                    value={draft.dateFrom}
                    onChange={(event) => set({ dateFrom: event.target.value, week: '', date: '' })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <CalendarDays className="h-3 w-3" /> To
                  </span>
                  <input
                    type="date"
                    className="input !rounded-xl !py-2.5 text-sm"
                    value={draft.dateTo}
                    onChange={(event) => set({ dateTo: event.target.value, week: '', date: '' })}
                  />
                </label>
              </div>
            </div>
          </section>

          {children ? (
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-navy">
                More filters
              </p>
              <div className="grid gap-3">{children}</div>
            </section>
          ) : null}
        </div>

        <SheetFooter className="shrink-0 gap-3 border-t border-border bg-white px-5 py-4">
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-ghost !rounded-xl flex-1 border border-border"
              onClick={() => {
                setDraft(EMPTY_REPORT_FILTERS);
                onReset?.();
              }}
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
            <button
              type="button"
              className="btn-primary !rounded-xl flex-1"
              onClick={apply}
            >
              Apply filters
            </button>
          </div>
          <button
            type="button"
            className="btn-secondary !rounded-xl w-full !border-navy/15 !bg-navy !text-white hover:!bg-navy/90"
            onClick={() => void download()}
            disabled={downloading}
          >
            <Download className="h-4 w-4" />
            {downloading ? 'Preparing report…' : 'Download PDF report'}
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
