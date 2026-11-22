'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, FileWarning, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { curriculumAdminApi } from '@/lib/curriculum-admin-api';
import { useToast } from '@/shared/notifications/toast/toast';
import { CurriculumPageShell } from './curriculum-page-shell';

type UnitNode = {
  id: string;
  unitNumber: string;
  title: string;
  suggestedPeriods?: number | null;
  lessons: Array<{
    id: string;
    lessonNumber?: string | null;
    title: string;
    suggestedPeriods?: number | null;
    objectives: Array<{ statement: string }>;
  }>;
};

export function BookReviewView({ bookId }: { bookId: string }) {
  const toast = useToast();
  const [book, setBook] = useState<Record<string, unknown> | null>(null);
  const [units, setUnits] = useState<UnitNode[]>([]);
  const [validation, setValidation] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageText, setPageText] = useState<string | null>(null);
  const [pageMeta, setPageMeta] = useState<Record<string, unknown> | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const pageCount = Number(book?.pageCount ?? validation?.pageCount ?? 1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, tree, val] = await Promise.all([
        curriculumAdminApi.getBook(bookId),
        curriculumAdminApi.getTree(bookId),
        curriculumAdminApi.getValidation(bookId).catch(() => null),
      ]);
      setBook(b);
      setUnits((tree.units as UnitNode[]) ?? []);
      setValidation(val);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load book');
    } finally {
      setLoading(false);
    }
  }, [bookId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let revoked: string | null = null;
    (async () => {
      try {
        const blob = await curriculumAdminApi.fetchBookPdfBlob(bookId);
        revoked = URL.createObjectURL(blob);
        setPdfUrl(revoked);
      } catch {
        setPdfUrl(null);
      }
    })();
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [bookId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const page = await curriculumAdminApi.getPage(bookId, pageNumber);
        if (cancelled) return;
        setPageText(page?.textContent ?? '(No text extracted for this page.)');
        setPageMeta(page as unknown as Record<string, unknown>);
      } catch {
        if (!cancelled) setPageText('Could not load page text.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId, pageNumber]);

  const pdfViewerSrc = useMemo(() => {
    if (!pdfUrl) return null;
    return `${pdfUrl}#page=${pageNumber}`;
  }, [pdfUrl, pageNumber]);

  const publish = async () => {
    setPublishing(true);
    try {
      await curriculumAdminApi.setStatus(bookId, 'PUBLISHED');
      toast.success('Curriculum published for teachers');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const reprocess = async () => {
    setReprocessing(true);
    try {
      await curriculumAdminApi.reprocess(bookId);
      toast.success('Extraction queued — refresh in a moment');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Reprocess failed');
    } finally {
      setReprocessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="animate-spin text-[#000435]" size={36} />
      </div>
    );
  }

  const title = String(book?.title ?? 'Curriculum book');
  const status = String(book?.processingStatus ?? '');
  const processingError = book?.processingError ? String(book.processingError) : '';

  return (
    <CurriculumPageShell
      title={title}
      subtitle="Verify PDF pages against extracted text and curriculum tree before publishing to teachers."
      actions={
        <>
          <Link
            href="/super-admin/curriculum/library"
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
          >
            Back
          </Link>
          <button
            type="button"
            disabled={reprocessing}
            onClick={() => void reprocess()}
            className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-60"
          >
            <RefreshCw size={14} className={reprocessing ? 'animate-spin' : ''} />
            Re-extract
          </button>
          {status !== 'PUBLISHED' ? (
            <button
              type="button"
              disabled={publishing}
              onClick={() => void publish()}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-[#000435] disabled:opacity-60"
              style={{ background: '#FCB038' }}
            >
              {publishing ? 'Publishing…' : 'Publish'}
            </button>
          ) : null}
        </>
      }
    >
      {processingError ? (
        <div className="mb-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <FileWarning size={18} className="shrink-0" />
          {processingError}
        </div>
      ) : null}

      {validation ? (
        <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm sm:grid-cols-4">
          <Stat label="Pages" value={String(validation.pageCount ?? '—')} />
          <Stat label="Units" value={String(validation.unitCount ?? '—')} />
          <Stat label="Lessons" value={String(validation.lessonCount ?? '—')} />
          <Stat label="Review flags" value={String(validation.lowConfidencePages ?? '—')} />
        </div>
      ) : null}

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-widest text-[#000435]">Source PDF</p>
            <div className="flex items-center gap-2 text-sm">
              <button
                type="button"
                className="rounded-lg border px-2 py-1 disabled:opacity-40"
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <span>
                Page {pageNumber} / {pageCount}
              </span>
              <button
                type="button"
                className="rounded-lg border px-2 py-1 disabled:opacity-40"
                disabled={pageNumber >= pageCount}
                onClick={() => setPageNumber((p) => Math.min(pageCount, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
          {pdfViewerSrc ? (
            <iframe title="Curriculum PDF" src={pdfViewerSrc} className="h-[520px] w-full bg-slate-100" />
          ) : (
            <p className="p-6 text-sm text-slate-500">Upload a PDF or re-run extraction to preview the file.</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-widest text-[#FCB038]">Extracted text</p>
            {pageMeta ? (
              <p className="mt-1 text-xs text-slate-500">
                Confidence: {String(pageMeta.extractionConfidence ?? '—')}
                {pageMeta.isScanned ? ' · scanned' : ''}
                {pageMeta.ocrApplied ? ' · OCR' : ''}
                {pageMeta.needsManualReview ? ' · needs review' : ''}
              </p>
            ) : null}
          </div>
          <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap p-4 text-xs leading-relaxed text-slate-800 font-mono">
            {pageText}
          </pre>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-bold text-[#000435]">Curriculum tree</h2>
      <div className="space-y-4">
        {units.length === 0 ? (
          <p className="text-sm text-slate-600">
            No units yet. Upload the P5 Mathematics Teacher’s Guide PDF and wait for extraction, then refresh.
          </p>
        ) : (
          units.map((unit) => (
            <div key={unit.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#FCB038]">Unit {unit.unitNumber}</p>
                  <h3 className="mt-1 text-lg font-bold text-[#000435]">{unit.title}</h3>
                </div>
                {unit.suggestedPeriods ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {unit.suggestedPeriods} periods
                  </span>
                ) : null}
              </div>
              <ul className="mt-4 space-y-2">
                {unit.lessons.map((lesson) => (
                  <li
                    key={lesson.id}
                    className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2"
                  >
                    <ChevronRight size={16} className="mt-0.5 shrink-0 text-[#FCB038]" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[#000435]">
                        {lesson.lessonNumber ? `${lesson.lessonNumber} · ` : ''}
                        {lesson.title}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </CurriculumPageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-xl font-bold text-[#000435]">{value}</p>
    </div>
  );
}
