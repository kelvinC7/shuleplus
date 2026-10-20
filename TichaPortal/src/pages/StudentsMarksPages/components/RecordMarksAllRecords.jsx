import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Eye, Loader2, Pencil, Search, Send } from 'lucide-react';
import useTpAcademic from '../../../hooks/useTpAcademic';
import { fetchCoursesMarksDashboard, submitAssessmentMarks } from '../../../services/coursesMarksApi';
import { tpApiError } from '../../../services/teacherPortalApi';
import { useTpToast } from '../../../components/TpToast.jsx';

const PAGE_SIZES = [8, 12, 20];

function isPublishedRecord(a) {
  if (a.is_locked) return true;
  return ['submitted', 'under_review', 'approved', 'locked', 'edit_pending'].includes(a.ui_status);
}

function canPublishRecord(a) {
  return !isPublishedRecord(a) && (a.marks_entered ?? 0) > 0;
}

function recordBadge(a) {
  if (isPublishedRecord(a)) {
    return { label: 'Published', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200/70' };
  }
  if ((a.marks_entered ?? 0) > 0) {
    return { label: 'Draft', className: 'bg-amber-50 text-amber-900 ring-amber-200/70' };
  }
  return { label: 'No marks', className: 'bg-slate-100 text-slate-600 ring-slate-200/70' };
}

function StatusPill({ assessment }) {
  const rec = recordBadge(assessment);
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${rec.className}`}>
      {rec.label}
    </span>
  );
}

function Checkbox({ checked, indeterminate, onChange, ariaLabel }) {
  return (
    <label className="relative inline-flex cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        checked={checked}
        ref={(el) => {
          if (el) el.indeterminate = !!indeterminate;
        }}
        onChange={onChange}
        aria-label={ariaLabel}
        className="peer sr-only"
      />
      <span className="flex h-[18px] w-[18px] items-center justify-center rounded-md border-2 border-slate-300 bg-white transition peer-checked:border-[#000435] peer-checked:bg-[#000435] peer-focus-visible:ring-2 peer-focus-visible:ring-[#FCB038]/40 peer-checked:[&_svg]:opacity-100">
        <svg className="h-3 w-3 text-white opacity-0" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </label>
  );
}

function PaginationBar({ page, pageCount, pageSize, total, onPage, onPageSize }) {
  const pages = useMemo(() => {
    const max = 5;
    let start = Math.max(0, page - Math.floor(max / 2));
    let end = Math.min(pageCount, start + max);
    start = Math.max(0, end - max);
    return Array.from({ length: end - start }, (_, i) => start + i);
  }, [page, pageCount]);

  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/80 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <p className="text-center text-xs text-slate-500 sm:text-left">
        Showing <span className="font-semibold text-[#000435]">{from}-{to}</span> of{' '}
        <span className="font-semibold text-[#000435]">{total}</span>
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <select
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value))}
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-[#000435]"
          aria-label="Rows per page"
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={page <= 0}
          onClick={() => onPage(page - 1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#000435] disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p)}
            className={`inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg px-2 text-xs font-bold tabular-nums ${
              p === page ? 'bg-[#000435] text-white shadow-sm' : 'border border-slate-200 bg-white text-[#000435] hover:border-[#FCB038]'
            }`}
          >
            {p + 1}
          </button>
        ))}
        <button
          type="button"
          disabled={page >= pageCount - 1}
          onClick={() => onPage(page + 1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#000435] disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function RecordMarksAllRecords() {
  const { academicYear, term, ready, settings } = useTpAcademic();
  const [loading, setLoading] = useState(true);
  const toast = useTpToast();
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [publishingId, setPublishingId] = useState(null);
  const [bulkPublishing, setBulkPublishing] = useState(false);
  const [scheduleYear, setScheduleYear] = useState('');
  const [scheduleTerm, setScheduleTerm] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(8);
  const [selected, setSelected] = useState(() => new Set());

  useEffect(() => {
    if (ready) {
      setScheduleYear(academicYear || settings?.currentAcademicYear || '');
      setScheduleTerm(term || settings?.currentTerm || '');
    }
  }, [ready, academicYear, term, settings]);

  const load = useCallback(async () => {
    if (!scheduleYear || !scheduleTerm) return;
    setLoading(true);
    try {
      const res = await fetchCoursesMarksDashboard({
        academic_year: scheduleYear,
        term: scheduleTerm,
      });
      if (!res?.success) throw new Error(res?.message || 'Failed to load');
      setRows(Array.isArray(res.data?.assessments) ? res.data.assessments : []);
    } catch (err) {
      toast.error(tpApiError(err, 'Could not load records'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [scheduleYear, scheduleTerm]);

  useEffect(() => {
    if (ready && scheduleYear && scheduleTerm) void load();
  }, [ready, load, scheduleYear, scheduleTerm]);

  const filtered = useMemo(() => {
    let list = rows;
    if (filter === 'draft') list = list.filter((a) => !isPublishedRecord(a) && (a.marks_entered ?? 0) > 0);
    if (filter === 'published') list = list.filter((a) => isPublishedRecord(a));
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (a) =>
        a.title?.toLowerCase().includes(q) ||
        a.subject?.toLowerCase().includes(q) ||
        a.class_name?.toLowerCase().includes(q),
    );
  }, [rows, filter, search]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      draft: rows.filter((a) => !isPublishedRecord(a) && (a.marks_entered ?? 0) > 0).length,
      published: rows.filter((a) => isPublishedRecord(a)).length,
    }),
    [rows],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize) || 1);
  const safePage = Math.min(page, pageCount - 1);

  useEffect(() => {
    setPage(0);
    setSelected(new Set());
  }, [filter, search, scheduleYear, scheduleTerm, pageSize]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const pageRows = useMemo(() => {
    const start = safePage * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const pageIds = pageRows.map((r) => r.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id)) && !allPageSelected;

  const selectedPublishable = useMemo(
    () => [...selected].filter((id) => canPublishRecord(filtered.find((r) => r.id === id) || {})),
    [selected, filtered],
  );

  function toggleRow(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePageAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function publishOne(id, { reload = true } = {}) {
    setPublishingId(id);
    try {
      const res = await submitAssessmentMarks(id);
      if (!res?.success && res?.submitted !== true) throw new Error(res?.message || 'Publish failed');
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (reload) toast.success('Marks published for review');
      if (reload) await load();
      return true;
    } catch (err) {
      toast.error(tpApiError(err, 'Could not publish marks'));
      return false;
    } finally {
      setPublishingId(null);
    }
  }

  async function handlePublish(id) {
    if (!window.confirm('Publish these marks? They will be submitted for review.')) return;
    await publishOne(id);
  }

  async function handleBulkPublish() {
    if (!selectedPublishable.length) return;
    if (!window.confirm(`Publish ${selectedPublishable.length} selected draft record(s)?`)) return;
    setBulkPublishing(true);
    try {
      for (const id of selectedPublishable) {
        setPublishingId(id);
        const res = await submitAssessmentMarks(id);
        if (!res?.success && res?.submitted !== true) throw new Error(res?.message || 'Publish failed');
      }
      setSelected(new Set());
      toast.success(`${selectedPublishable.length} record(s) published`);
      await load();
    } catch (err) {
      toast.error(tpApiError(err, 'Could not publish marks'));
    } finally {
      setPublishingId(null);
      setBulkPublishing(false);
    }
  }

  const yearOptions = settings?.academicYears?.length ? settings.academicYears : scheduleYear ? [scheduleYear] : [];
  const termOptions = settings?.terms?.length ? settings.terms : ['Term 1', 'Term 2', 'Term 3'];

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#000435]/[0.03] to-transparent px-4 py-4 sm:px-5">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <select
              className="tp-input h-10 text-sm"
              value={scheduleYear}
              onChange={(e) => setScheduleYear(e.target.value)}
              aria-label="Academic year"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              className="tp-input h-10 text-sm"
              value={scheduleTerm}
              onChange={(e) => setScheduleTerm(e.target.value)}
              aria-label="Term"
            >
              {termOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <div className="relative col-span-2 sm:col-span-1 sm:min-w-[220px] sm:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
              <input
                type="search"
                placeholder="Search assessment, class, subject…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="tp-input h-10 w-full pl-10 text-sm"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
              {[
                { id: 'all', label: 'All', count: counts.all },
                { id: 'draft', label: 'Drafts', count: counts.draft },
                { id: 'published', label: 'Published', count: counts.published },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFilter(t.id)}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold sm:flex-none sm:px-4 ${
                    filter === t.id ? 'bg-white text-[#000435] shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {t.label}
                  <span className="ml-1 tabular-nums text-slate-400">({t.count})</span>
                </button>
              ))}
            </div>
            {selectedPublishable.length > 0 ? (
              <button
                type="button"
                disabled={bulkPublishing}
                onClick={() => void handleBulkPublish()}
                className="tp-btn-primary inline-flex h-10 items-center justify-center gap-2 text-xs sm:text-sm"
              >
                {bulkPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Publish selected ({selectedPublishable.length})
              </button>
            ) : null}
          </div>
        </div>


        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#c87800]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-500">No mark records for this period.</div>
        ) : (
          <>
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/90 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="w-12 px-3 py-3">
                        <Checkbox checked={allPageSelected} indeterminate={somePageSelected} onChange={togglePageAll} ariaLabel="Select all on page" />
                      </th>
                      <th className="w-10 px-2 py-3">#</th>
                      {['Assessment', 'Class', 'Subject', 'Entered', 'Avg', 'Status', 'Actions'].map((h) => (
                        <th key={h} className="px-4 py-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pageRows.map((a, idx) => {
                      const canPublish = canPublishRecord(a);
                      const rowNum = safePage * pageSize + idx + 1;
                      const isSelected = selected.has(a.id);
                      return (
                        <tr
                          key={a.id}
                          className={`transition-colors ${isSelected ? 'bg-[#FCB038]/10' : 'hover:bg-slate-50/80'}`}
                        >
                          <td className="px-3 py-3">
                            <Checkbox checked={isSelected} onChange={() => toggleRow(a.id)} ariaLabel={`Select ${a.title}`} />
                          </td>
                          <td className="px-2 py-3 text-xs font-medium tabular-nums text-slate-400">{rowNum}</td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-[#000435]">{a.title}</p>
                            {a.component_name ? <p className="text-xs text-slate-400">{a.component_name}</p> : null}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-600">{a.class_name}</td>
                          <td className="px-4 py-3 text-slate-700">{a.subject}</td>
                          <td className="px-4 py-3">
                            <span className="tabular-nums text-slate-600">
                              {a.marks_entered ?? 0}
                              <span className="text-slate-300">/</span>
                              {a.marks_total ?? '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 tabular-nums font-semibold text-[#000435]">
                            {a.average != null ? a.average : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill assessment={a} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              <Link
                                to={`/assessments/${a.id}/marks`}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#000435] shadow-sm hover:border-[#FCB038]"
                              >
                                {canPublish ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                {canPublish ? 'Edit' : 'View'}
                              </Link>
                              {canPublish ? (
                                <button
                                  type="button"
                                  disabled={publishingId === a.id || bulkPublishing}
                                  onClick={() => void handlePublish(a.id)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-[#000435] px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#000435]/90 disabled:opacity-50"
                                >
                                  {publishingId === a.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Send className="h-3.5 w-3.5" />
                                  )}
                                  Publish
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <PaginationBar
                page={safePage}
                pageCount={pageCount}
                pageSize={pageSize}
                total={filtered.length}
                onPage={setPage}
                onPageSize={(n) => {
                  setPageSize(n);
                  setPage(0);
                }}
              />
            </div>

            <div className="space-y-3 p-3 md:hidden">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <Checkbox checked={allPageSelected} indeterminate={somePageSelected} onChange={togglePageAll} ariaLabel="Select all on page" />
                <span className="text-xs text-slate-500">{selected.size} selected</span>
              </div>
              {pageRows.map((a, idx) => {
                const canPublish = canPublishRecord(a);
                const rowNum = safePage * pageSize + idx + 1;
                return (
                  <article
                    key={a.id}
                    className={`overflow-hidden rounded-xl border bg-white shadow-sm ${
                      selected.has(a.id) ? 'border-[#FCB038] ring-1 ring-[#FCB038]/30' : 'border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-start gap-3 border-b border-slate-100 px-3 py-3">
                      <Checkbox checked={selected.has(a.id)} onChange={() => toggleRow(a.id)} ariaLabel={`Select ${a.title}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold tabular-nums text-slate-400">#{rowNum}</p>
                            <p className="truncate font-semibold text-[#000435]">{a.title}</p>
                            <p className="text-xs text-slate-500">
                              {a.class_name} · {a.subject}
                            </p>
                          </div>
                          <StatusPill assessment={a} />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 px-4 py-3 text-center text-xs">
                      <div>
                        <p className="text-slate-400">Entered</p>
                        <p className="font-bold tabular-nums text-[#000435]">
                          {a.marks_entered ?? 0}/{a.marks_total ?? '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Max</p>
                        <p className="font-bold text-[#000435]">{a.max_mark}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Avg</p>
                        <p className="font-bold tabular-nums text-[#000435]">{a.average != null ? a.average : '-'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 border-t border-slate-100 px-3 py-3">
                      <Link to={`/assessments/${a.id}/marks`} className="tp-btn-secondary inline-flex h-10 flex-1 items-center justify-center text-xs">
                        {canPublish ? 'Edit' : 'View'}
                      </Link>
                      {canPublish ? (
                        <button
                          type="button"
                          disabled={publishingId === a.id || bulkPublishing}
                          onClick={() => void handlePublish(a.id)}
                          className="tp-btn-primary inline-flex h-10 flex-1 items-center justify-center gap-1 text-xs disabled:opacity-50"
                        >
                          {publishingId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          Publish
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
              <PaginationBar
                page={safePage}
                pageCount={pageCount}
                pageSize={pageSize}
                total={filtered.length}
                onPage={setPage}
                onPageSize={(n) => {
                  setPageSize(n);
                  setPage(0);
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
