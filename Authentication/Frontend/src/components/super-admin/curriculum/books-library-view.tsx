'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  BookOpen,
  ExternalLink,
  Eye,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  Upload,
} from 'lucide-react';
import {
  curriculumAdminApi,
  type CurriculumBookRow,
  type EducationLevelConfig,
} from '@/lib/curriculum-admin-api';
import { useToast } from '@/shared/notifications/toast/toast';
import { RepPagination } from '@/components/school-representative/rep-pagination';
import { CurriculumPageShell } from './curriculum-page-shell';

const NAVY = '#000435';
const AMBER = '#FCB038';

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: 'bg-emerald-500/15 text-emerald-800 ring-1 ring-emerald-500/30',
  NEEDS_REVIEW: 'bg-amber-500/15 text-amber-900 ring-1 ring-amber-500/40',
  EXTRACTING: 'bg-sky-500/15 text-sky-900 ring-1 ring-sky-500/30',
  UPLOADED: 'bg-slate-500/10 text-slate-700 ring-1 ring-slate-300',
  FAILED: 'bg-red-500/15 text-red-800 ring-1 ring-red-500/30',
  ARCHIVED: 'bg-slate-200 text-slate-600',
  APPROVED: 'bg-indigo-500/15 text-indigo-900 ring-1 ring-indigo-500/30',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'UPLOADED', label: 'Uploaded' },
  { value: 'EXTRACTING', label: 'Extracting' },
  { value: 'NEEDS_REVIEW', label: 'Needs review' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const DOC_TYPE_LABEL: Record<string, string> = {
  teachers_guide: "Teacher's Guide",
  pupils_book: "Pupil's Book",
  syllabus: 'Syllabus / Framework',
  other: 'Other',
};

function formatBytes(n?: number | null) {
  if (n == null || n <= 0) return null;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatPages(n?: number | null) {
  if (n == null || n <= 0) return null;
  return n.toLocaleString();
}

function failureMessage(b: CurriculumBookRow) {
  return (
    b.processingError?.trim() ||
    b.lastJobError?.trim() ||
    'Extraction failed. Check AI Processing Jobs or retry after verifying the PDF and Python worker.'
  );
}

function ActionMenu({
  book,
  onRetry,
  retrying,
}: {
  book: CurriculumBookRow;
  onRetry: (id: string) => void;
  retrying: string | null;
}) {
  const [open, setOpen] = useState(false);
  const canRetry = book.processingStatus === 'FAILED' || book.processingStatus === 'UPLOADED';

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        aria-label="Actions"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-[#000435]/30 hover:text-[#000435]"
      >
        <MoreHorizontal size={16} />
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-1 w-44 origin-top-right rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            <Link
              href={`/super-admin/curriculum/review/${book.id}`}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => setOpen(false)}
            >
              <Eye size={14} />
              {book.processingStatus === 'NEEDS_REVIEW' ? 'Review' : 'Open'}
            </Link>
            {canRetry ? (
              <button
                type="button"
                disabled={retrying === book.id}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                onClick={() => {
                  setOpen(false);
                  onRetry(book.id);
                }}
              >
                {retrying === book.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RotateCcw size={14} />
                )}
                Retry extraction
              </button>
            ) : null}
            <Link
              href="/super-admin/curriculum/jobs"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => setOpen(false)}
            >
              <ExternalLink size={14} />
              View jobs
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function BooksLibraryView() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const [books, setBooks] = useState<CurriculumBookRow[]>([]);
  const [levels, setLevels] = useState<EducationLevelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [expandedErrorId, setExpandedErrorId] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    search: searchParams.get('search') ?? '',
    status: searchParams.get('status') ?? '',
    educationLevel: searchParams.get('educationLevel') ?? '',
    grade: searchParams.get('grade') ?? '',
    subject: searchParams.get('subject') ?? '',
  });

  useEffect(() => {
    setFilters({
      search: searchParams.get('search') ?? '',
      status: searchParams.get('status') ?? '',
      educationLevel: searchParams.get('educationLevel') ?? '',
      grade: searchParams.get('grade') ?? '',
      subject: searchParams.get('subject') ?? '',
    });
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    curriculumAdminApi.getEducationLevels().then(setLevels).catch(() => setLevels([]));
  }, []);

  const gradeOptions = useMemo(() => {
    if (!filters.educationLevel) return [];
    return levels.find((l) => l.id === filters.educationLevel)?.grades ?? [];
  }, [levels, filters.educationLevel]);

  const queryParams = useMemo(() => {
    const p: Record<string, string> = {
      page: String(page),
      pageSize: String(pageSize),
    };
    if (filters.search.trim()) p.search = filters.search.trim();
    if (filters.status) p.status = filters.status;
    if (filters.educationLevel) p.educationLevel = filters.educationLevel;
    if (filters.grade) p.grade = filters.grade;
    if (filters.subject.trim()) p.subject = filters.subject.trim();
    return p;
  }, [filters, page, pageSize]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await curriculumAdminApi.listBooks(queryParams);
      setBooks(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setPage(data.page);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load books');
    } finally {
      setLoading(false);
    }
  }, [queryParams, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const extracting = books.some((b) => b.processingStatus === 'EXTRACTING' || b.processingStatus === 'UPLOADED');
    if (!extracting) return;
    const t = setInterval(() => void load(), 8000);
    return () => clearInterval(t);
  }, [books, load]);

  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.status, filters.educationLevel, filters.grade, filters.subject, pageSize]);

  const onLevelChange = (educationLevel: string) => {
    const firstGrade = levels.find((l) => l.id === educationLevel)?.grades[0]?.id ?? '';
    setFilters((f) => ({ ...f, educationLevel, grade: firstGrade }));
  };

  const onRetry = async (bookId: string) => {
    setRetrying(bookId);
    try {
      await curriculumAdminApi.reprocess(bookId);
      toast.success('Extraction queued again');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Retry failed');
    } finally {
      setRetrying(null);
    }
  };

  const isReviewQueue = filters.status === 'NEEDS_REVIEW';
  const rowOffset = (page - 1) * pageSize;

  return (
    <CurriculumPageShell
      title={isReviewQueue ? 'Review & Publish' : 'Curriculum Library'}
      subtitle={
        isReviewQueue
          ? 'Books awaiting human verification before teachers can use extracted curriculum.'
          : 'Browse and manage official books by education level, class, subject and version.'
      }
      actions={
        <Link
          href="/super-admin/curriculum/add"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-[#000435] shadow-sm"
          style={{ background: AMBER }}
        >
          <Upload size={16} />
          Add book
        </Link>
      }
    >
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm lg:col-span-2 focus:border-[#000435]/40 focus:outline-none focus:ring-2 focus:ring-[#FCB038]/40"
            placeholder="Search title…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={filters.educationLevel}
            onChange={(e) => onLevelChange(e.target.value)}
          >
            <option value="">All levels</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
            value={filters.grade}
            disabled={!filters.educationLevel}
            onChange={(e) => setFilters((f) => ({ ...f, grade: e.target.value }))}
          >
            <option value="">All classes</option>
            {gradeOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <input
            className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Subject filter"
            value={filters.subject}
            onChange={(e) => setFilters((f) => ({ ...f, subject: e.target.value }))}
          />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Rows
              <select
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                {[10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-[#000435]"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {loading && books.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-[#000435]" size={32} />
        </div>
      ) : books.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <BookOpen className="mx-auto text-slate-300" size={40} />
          <p className="mt-4 font-medium text-slate-700">No curriculum books match your filters</p>
          <p className="mt-1 text-sm text-slate-500">
            Upload a PDF with the wizard or adjust filters. Extraction never auto-publishes.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-white" style={{ background: NAVY }}>
                  <th className="w-12 px-3 py-3.5 font-semibold">#</th>
                  <th className="min-w-[200px] px-4 py-3.5 font-semibold">Title</th>
                  <th className="px-4 py-3.5 font-semibold">Subject / class</th>
                  <th className="px-4 py-3.5 font-semibold">Type</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-4 py-3.5 font-semibold text-right">Pages</th>
                  <th className="px-4 py-3.5 font-semibold text-right">Size</th>
                  <th className="w-28 px-4 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {books.map((b, idx) => {
                  const pages = formatPages(b.pageCount);
                  const size = formatBytes(b.fileSizeBytes);
                  const docLabel =
                    (b.documentType && DOC_TYPE_LABEL[b.documentType]) ||
                    (b.documentType ? b.documentType.replace(/_/g, ' ') : null);
                  const isFailed = b.processingStatus === 'FAILED';
                  const err = isFailed ? failureMessage(b) : null;
                  const showError = expandedErrorId === b.id;

                  return (
                    <tr key={b.id} className="group transition-colors hover:bg-slate-50/90">
                      <td className="px-3 py-3 text-xs font-semibold tabular-nums text-slate-400">
                        {rowOffset + idx + 1}
                      </td>
                      <td className="max-w-xs px-4 py-3">
                        <p className="font-semibold leading-snug text-[#000435]" title={b.title}>
                          {b.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          Updated {new Date(b.updatedAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="font-medium text-slate-800">{b.subject}</span>
                        <span className="text-slate-400"> · </span>
                        {b.grade}
                        {b.edition ? (
                          <span className="mt-0.5 block text-xs text-slate-400">{b.edition}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{docLabel ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[b.processingStatus] ?? 'bg-slate-100'}`}
                          >
                            {isFailed ? <AlertCircle size={12} className="shrink-0" /> : null}
                            {b.processingStatus.replace(/_/g, ' ')}
                          </span>
                          {isFailed && err ? (
                            <button
                              type="button"
                              className="max-w-[220px] text-left text-[11px] font-medium text-red-700 underline decoration-red-300 underline-offset-2 hover:text-red-900"
                              onClick={() => setExpandedErrorId(showError ? null : b.id)}
                            >
                              {showError ? 'Hide reason' : 'Why failed?'}
                            </button>
                          ) : null}
                          {showError && err ? (
                            <p className="max-w-xs rounded-lg border border-red-100 bg-red-50 px-2 py-1.5 text-[11px] leading-relaxed text-red-900">
                              {err}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                        {pages ?? (
                          <span className="text-slate-400" title="Filled after PDF extraction completes">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                        {size ?? (
                          <span
                            className="text-slate-400"
                            title="Missing for legacy seed rows; re-upload or check storage"
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ActionMenu book={b} onRetry={onRetry} retrying={retrying} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {loading ? (
            <div className="flex justify-center border-t border-slate-100 py-3">
              <Loader2 className="animate-spin text-slate-400" size={20} />
            </div>
          ) : null}
          <RepPagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </div>
      )}
    </CurriculumPageShell>
  );
}
