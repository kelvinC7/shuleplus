'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Download, FileText, Lock } from 'lucide-react';
import { api } from '@/services/api';
import { NativeSelect } from '@/components/ui/native-select';
import { cn } from '@/lib/utils';
import { ReportCardViewerModal } from '@/components/report-card/report-card-viewer-modal';
import type { ReportCardDataV2 } from '@/types/report-card';

type ReportItem = {
  id: string;
  classId: string;
  className: string | null;
  academicYear: string;
  term: string;
  publishedAt: string;
  access?: { allowed: boolean; message?: string | null };
};

export function ReportCardsPanel({
  studentId,
  academicYear,
  term,
  onAcademicYearChange,
  onTermChange,
  years,
  terms,
}: {
  studentId: string;
  academicYear: string;
  term: string;
  onAcademicYearChange: (y: string) => void;
  onTermChange: (t: string) => void;
  years: string[];
  terms: string[];
}) {
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportCardDataV2 | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

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

  async function openReport(item: ReportItem) {
    if (item.access && !item.access.allowed) {
      setError(
        item.access.message ||
          'Please pay remaining school fees to open the student report. Contact the school if you have a payment agreement.'
      );
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
      const res = await api.get<{ data: { report: ReportCardDataV2 } }>(`/report-cards/view?${q}`);
      setReport(res.data.data.report);
      setViewerOpen(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Report unavailable.';
      setError(msg);
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Year</span>
          <NativeSelect value={academicYear} onChange={(e) => onAcademicYearChange(e.target.value)} className="w-full">
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Term</span>
          <NativeSelect value={term} onChange={(e) => onTermChange(e.target.value)} className="w-full">
            {terms.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </NativeSelect>
        </label>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted">Loading report cards…</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-slate-50 px-4 py-10 text-center text-sm text-muted">
          No published report cards for this period yet.
        </p>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => {
            const blocked = item.access && !item.access.allowed;
            const opening = openingId === item.id;
            return (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-navy">
                    {blocked ? <Lock className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-semibold text-navy">
                      {item.className} · {item.term}
                    </p>
                    <p className="text-xs text-muted">{item.academicYear}</p>
                    {blocked ? (
                      <p className="mt-1 text-xs font-medium text-amber-800">Fees clearance required</p>
                    ) : (
                      <p className="mt-1 text-xs text-emerald-700">Ready</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={opening}
                  onClick={() => void openReport(item)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-60',
                    blocked
                      ? 'border border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100'
                      : 'bg-navy text-white hover:bg-navy/90'
                  )}
                >
                  {blocked ? <Lock className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                  {opening ? 'Opening…' : blocked ? 'Why locked?' : 'View & download'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <ReportCardViewerModal open={viewerOpen} report={report} onClose={() => setViewerOpen(false)} />
    </div>
  );
}
