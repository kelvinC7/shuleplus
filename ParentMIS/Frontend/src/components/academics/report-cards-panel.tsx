'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, FileText, Lock, Search, Sparkles } from 'lucide-react';
import { api } from '@/services/api';
import { NativeSelect } from '@/components/ui/native-select';
import { cn } from '@/lib/utils';
import { ReportCardViewerModal } from '@/components/report-card/report-card-viewer-modal';
import type { ReportCardDataV2 } from '@/types/report-card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type ReportItem = {
  id: string;
  classId: string;
  className: string | null;
  academicYear: string;
  term: string;
  publishedAt: string;
  reportKind?: string;
  access?: { allowed: boolean; message?: string | null; balance?: number; paymentStatus?: string; hasActiveLoan?: boolean };
};

type KindFilter = 'all' | 'standard' | 'beginning' | 'midterm';

function reportKindLabel(kind?: string) {
  if (kind === 'beginning') return 'Beginning term';
  if (kind === 'midterm') return 'Mid-term';
  return 'Term report';
}

function formatPublished(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ReportCardsPanel({
  studentId,
  academicYear,
  term,
  onAcademicYearChange,
  onTermChange,
  years,
  terms,
  embedded = false,
}: {
  studentId: string;
  academicYear: string;
  term: string;
  onAcademicYearChange: (y: string) => void;
  onTermChange: (t: string) => void;
  years: string[];
  terms: string[];
  /** When true, year/term are controlled by the parent Academic header (no duplicate filters). */
  embedded?: boolean;
}) {
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportCardDataV2 | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [search, setSearch] = useState('');
  const [payPrompt, setPayPrompt] = useState<ReportItem | null>(null);

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ studentId });
      if (academicYear) params.set('academicYear', academicYear);
      if (term) params.set('term', term);
      const res = await api.get<{ data: { items: ReportItem[] } }>(`/report-cards?${params}`);
      setItems(res.data.data?.items ?? []);
    } catch {
      setError('Could not load report cards.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [studentId, academicYear, term]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'visible') void load();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (kindFilter === 'midterm' && item.reportKind !== 'midterm') return false;
      if (kindFilter === 'beginning' && item.reportKind !== 'beginning') return false;
      if (kindFilter === 'standard' && (item.reportKind === 'midterm' || item.reportKind === 'beginning')) return false;
      if (!q) return true;
      const hay = [item.className, item.term, item.academicYear, reportKindLabel(item.reportKind)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, kindFilter, search]);

  async function openReport(item: ReportItem) {
    if (item.access && !item.access.allowed) {
      setError(null);
      setPayPrompt(item);
      void load();
      return;
    }
    setError(null);
    setOpeningId(item.id);
    try {
      const q = new URLSearchParams({
        studentId,
        classId: item.classId,
        academicYear: item.academicYear,
        term: item.term,
      });
      if (item.reportKind === 'midterm' || item.reportKind === 'beginning') q.set('reportKind', item.reportKind);
      const res = await api.get<{ data: { report?: ReportCardDataV2; publication?: unknown } }>(
        `/report-cards/view?${q}`
      );
      const body = res.data.data;
      const card = (body as { report?: ReportCardDataV2 }).report ?? (body as unknown as ReportCardDataV2);
      setReport(card);
      setViewerOpen(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Report unavailable.';
      const blockedMsg = /pay|clearance|not allowed|access/i.test(msg);
      if (blockedMsg) {
        setPayPrompt({ ...item, access: { ...(item.access || { allowed: false }), allowed: false, message: msg } });
      } else {
        setError(msg);
      }
      void load();
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <div className="min-w-0 space-y-4">
      {/* Filters */}
      <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5">
        {!embedded ? (
          <div>
            <p className="text-base font-extrabold text-navy">Published report cards</p>
            <p className="mt-0.5 text-sm text-muted">
              Official term reports from the school. Use the filters below or the Academic header above.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Showing reports for{' '}
            <span className="font-semibold text-navy">
              {term || 'this term'} · {academicYear || 'year'}
            </span>
          </p>
        )}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          {!embedded ? (
            <div className="grid w-full grid-cols-2 gap-3 sm:max-w-md">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">Year</span>
                <NativeSelect
                  value={academicYear}
                  onChange={(e) => onAcademicYearChange(e.target.value)}
                  className="w-full [&_select]:h-11 [&_select]:rounded-xl"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">Term</span>
                <NativeSelect
                  value={term}
                  onChange={(e) => onTermChange(e.target.value)}
                  className="w-full [&_select]:h-11 [&_select]:rounded-xl"
                >
                  {terms.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </NativeSelect>
              </label>
            </div>
          ) : null}
          <div className="relative w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search class or report type…"
              className="input h-11 w-full rounded-full pl-10"
            />
          </div>
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          {(
            [
              ['all', 'All published'],
              ['standard', 'Term reports'],
              ['beginning', 'Beginning term'],
              ['midterm', 'Mid-term'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setKindFilter(id)}
              className={cn(
                'min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition',
                kindFilter === id
                  ? 'bg-navy text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-muted/40" />
          <p className="mt-3 font-semibold text-navy">No published reports for this period</p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted">
            When the school publishes a report card for {term || 'this term'} {academicYear}, it will
            appear here. Check the <strong className="font-semibold text-navy">Marks</strong> tab for
            teacher scores as they are released.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((item) => {
            const blocked = item.access && !item.access.allowed;
            const opening = openingId === item.id;
            const isMid = item.reportKind === 'midterm' || item.reportKind === 'beginning';
            return (
              <article
                key={item.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm sm:p-5"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className={cn(
                      'grid h-12 w-12 shrink-0 place-items-center rounded-2xl',
                      blocked
                        ? 'bg-amber-100 text-amber-800'
                        : isMid
                          ? 'bg-violet-100 text-violet-900'
                          : 'bg-amber-100 text-navy'
                    )}
                  >
                    {blocked ? <Lock className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-bold text-navy">{item.className ?? 'Class'}</p>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          isMid ? 'bg-violet-100 text-violet-800' : 'bg-slate-100 text-slate-700'
                        )}
                      >
                        {reportKindLabel(item.reportKind)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {item.academicYear} · {item.term}
                      {item.publishedAt ? ` · Published ${formatPublished(item.publishedAt)}` : ''}
                    </p>
                    {blocked ? (
                      <div className="mt-1.5 space-y-0.5">
                        <p className="text-xs font-medium text-amber-800">Payment required to view</p>
                        <p className="text-xs text-amber-900/80">
                          {item.access?.message || 'This report is available after payment is confirmed and access is granted by the school.'}
                        </p>
                        {typeof item.access?.balance === 'number' && item.access.balance > 0 ? (
                          <p className="text-xs text-amber-900/80">Outstanding balance: {item.access.balance.toLocaleString()}</p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-1.5 text-xs font-medium text-emerald-700">Published · ready to view</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={opening}
                    onClick={() => void openReport(item)}
                    className={cn(
                      'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-bold transition active:scale-[0.99] disabled:opacity-60',
                      blocked
                        ? 'border border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100'
                        : 'bg-navy text-white hover:bg-navy/90'
                    )}
                  >
                    {opening ? 'Opening…' : blocked ? 'Pay to view report' : 'View report'}
                  </button>
                  {blocked ? (
                    <button
                      type="button"
                      onClick={() => void load()}
                      className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Refresh access status
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ReportCardViewerModal
        open={viewerOpen}
        report={report}
        onClose={() => setViewerOpen(false)}
        subtitle={[term, academicYear].filter(Boolean).join(' · ')}
      />

      <Dialog open={!!payPrompt} onOpenChange={(open) => !open && setPayPrompt(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-800">
              <Lock className="h-5 w-5" />
            </div>
            <DialogTitle className="text-navy">
              {payPrompt?.reportKind === 'midterm' || payPrompt?.reportKind === 'beginning' ? 'Pay to view marks' : 'Pay to view report'}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-slate-600">
              {payPrompt?.access?.message ||
                'This report is published for paid access. Please complete payment, then the school (DOS/administrator) can grant access so you can view it here.'}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">What happens next</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs leading-relaxed text-slate-600">
              <li>Complete the required payment for this student.</li>
              <li>The school can grant access by publishing this report to you from Academic Publishing.</li>
              <li>Return here and tap “Refresh access status” to open the report.</li>
            </ul>
            {typeof payPrompt?.access?.balance === 'number' && payPrompt.access.balance > 0 ? (
              <p className="mt-2 text-xs font-medium text-amber-800">
                Outstanding balance: {payPrompt.access.balance.toLocaleString()}
              </p>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPayPrompt(null);
                void load();
              }}
            >
              Refresh access
            </Button>
            <Button onClick={() => setPayPrompt(null)} className="bg-navy text-white hover:bg-navy/90">
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}