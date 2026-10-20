'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Eye,
  Pencil,
  Copy,
  FileDown,
  Search,
  FolderOpen,
  FileText,
  CheckCircle2,
  Plus,
  Printer,
  MoreHorizontal,
  Send,
  Trash2,
  Download,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ArrowUp,
  ArrowDown,
  Banknote,
  Calendar,
  GraduationCap,
  ListFilter,
  CalendarClock,
  ArrowUpDown,
  Languages,
} from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { Checkbox } from '@/components/checkbox';
import { calcCircularGrandTotal } from '@/lib/circular-totals';
import { useAcademicPeriod } from '@/contexts/academic-period-context';
import { useToast } from '@/shared/notifications';
import { OfficialDocModal } from '@/lib/official-doc/official-doc-modal';
import { isSharingLocked, readStoredDocLang, storeDocLang, needsTranslation, shortDocId, type DocLang } from '@/lib/official-doc/tokens';
import { timeAgo } from '@/lib/time-ago';
import {
  bulkAction,
  deleteCircular,
  duplicateCircular,
  fetchCirculars,
  publishCircular,
} from '@/services/babyeyi-api';
import type { Circular } from '@/types';
const PAGE_SIZE = 10;

type SortKey = 'createdAt' | 'className' | 'academicYear' | 'totalFee' | 'status';
interface SortState {
  key: SortKey;
  dir: 'asc' | 'desc';
}

const SORT_PRESETS: { value: string; label: string; sort: SortState }[] = [
  { value: 'newest', label: 'Newest First', sort: { key: 'createdAt', dir: 'desc' } },
  { value: 'oldest', label: 'Oldest First', sort: { key: 'createdAt', dir: 'asc' } },
  { value: 'fee-high', label: 'Total Fee (High to Low)', sort: { key: 'totalFee', dir: 'desc' } },
  { value: 'fee-low', label: 'Total Fee (Low to High)', sort: { key: 'totalFee', dir: 'asc' } },
  { value: 'class-az', label: 'Class (A–Z)', sort: { key: 'className', dir: 'asc' } },
];

const EMPTY_FILTERS = { academicYear: '', className: '', term: '', status: '', search: '' };
const DOC_LANGS: { code: DocLang; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'rw', label: 'RW' },
  { code: 'fr', label: 'FR' },
];

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return value;
  }
}

function activitySubtitle(c: Circular): string {
  const created = new Date(c.createdAt).getTime();
  const updated = new Date(c.updatedAt).getTime();
  if (updated - created > 60_000) return `Updated ${timeAgo(c.updatedAt)}`;
  return `Created ${timeAgo(c.createdAt)}`;
}

function toCsvValue(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function circularGrandTotal(c: Circular): number {
  return calcCircularGrandTotal(c.payments ?? [], c.requirements ?? []);
}

function compareCirculars(a: Circular, b: Circular, sort: SortState): number {
  let result = 0;
  switch (sort.key) {
    case 'className':
      result = a.className.localeCompare(b.className);
      break;
    case 'academicYear':
      result = a.academicYear.localeCompare(b.academicYear);
      break;
    case 'totalFee':
      result = circularGrandTotal(a) - circularGrandTotal(b);
      break;
    case 'status':
      result = a.status.localeCompare(b.status);
      break;
    case 'createdAt':
    default:
      result = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  }
  return sort.dir === 'asc' ? result : -result;
}

export function CircularListView() {
  const toast = useToast();
  const router = useRouter();
  const { settings: academicSettings, year: periodYear, term: periodTerm, loading: periodLoading } =
    useAcademicPeriod();
  const [circulars, setCirculars] = useState<Circular[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewId, setViewId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortState>({ key: 'createdAt', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [docLang, setDocLang] = useState<DocLang>('en');

  useEffect(() => {
    setDocLang(readStoredDocLang());
  }, []);

  function changeDocLang(next: DocLang) {
    setDocLang(next);
    storeDocLang(next);
  }

  async function load() {
    setLoading(true);
    try {
      const data = await fetchCirculars();
      setCirculars(data);
    } catch {
      toast.error('Failed to load circulars');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (periodLoading) return;
    setFilters((f) => ({
      ...f,
      academicYear: periodYear || f.academicYear,
      term: periodTerm || f.term,
    }));
  }, [periodLoading, periodYear, periodTerm]);

  useEffect(() => {
    setPage(1);
  }, [filters, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) => {
      if (prev.key === key) return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      return { key, dir: key === 'createdAt' || key === 'totalFee' ? 'desc' : 'asc' };
    });
  }

  const academicYearOptions = useMemo(() => {
    const fromCirculars = circulars.map((c) => c.academicYear).filter(Boolean);
    return [...new Set([...academicSettings.academicYears, ...fromCirculars])].sort().reverse();
  }, [circulars, academicSettings.academicYears]);
  const classOptions = useMemo(
    () => Array.from(new Set(circulars.map((c) => c.className))).sort(),
    [circulars]
  );
  const termOptions = useMemo(() => {
    const fromCirculars = Array.from(new Set(circulars.map((c) => c.term))).filter(Boolean);
    return [...new Set([...academicSettings.terms, ...fromCirculars])].sort();
  }, [circulars, academicSettings.terms]);

  const filteredSorted = useMemo(() => {
    const list = circulars.filter((c) => {
      if (filters.academicYear && c.academicYear !== filters.academicYear) return false;
      if (filters.className && c.className !== filters.className) return false;
      if (filters.term && c.term !== filters.term) return false;
      if (filters.status && c.status !== filters.status) return false;
      if (filters.search && !c.className.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });

    return [...list].sort((a, b) => compareCirculars(a, b, sort));
  }, [circulars, filters, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filteredSorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectPage() {
    setSelected((prev) => {
      const allSelected = paged.length > 0 && paged.every((c) => prev.has(c.id));
      const next = new Set(prev);
      if (allSelected) {
        paged.forEach((c) => next.delete(c.id));
      } else {
        paged.forEach((c) => next.add(c.id));
      }
      return next;
    });
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    setSort({ key: 'createdAt', dir: 'desc' });
  }

  function handleExport() {
    if (filteredSorted.length === 0) {
      toast.error('Nothing to export');
      return;
    }
    const header = ['Class', 'Academic Year', 'Term', 'Total Fee (RWF)', 'Status', 'Created At', 'Created By'];
    const rows = filteredSorted.map((c) => [
      c.className,
      c.academicYear,
      c.term,
      Number(circularGrandTotal(c)).toString(),
      c.status,
      formatDate(c.createdAt),
      c.authorName || 'Admin',
    ]);
    const csv = [header, ...rows].map((row) => row.map(toCsvValue).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `circulars-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredSorted.length} circular${filteredSorted.length === 1 ? '' : 's'}`);
  }

  async function handleDuplicate(id: string) {
    setBusyId(id);
    setMenuId(null);
    try {
      const copy = await duplicateCircular(id);
      toast.success('Duplicated as a new draft — change class or details as needed');
      router.push(`/create?id=${copy.id}`);
    } catch {
      toast.error('Duplicate failed');
    } finally {
      setBusyId(null);
    }
  }

  async function handlePublish(id: string) {
    setBusyId(id);
    setMenuId(null);
    try {
      await publishCircular(id);
      toast.success('Circular published');
      void load();
    } catch (err) {
      toast.error((err as Error)?.message || 'Publish failed');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this circular? This cannot be undone.')) return;
    setBusyId(id);
    setMenuId(null);
    try {
      await deleteCircular(id);
      toast.success('Circular deleted');
      void load();
    } catch {
      toast.error('Delete failed');
    } finally {
      setBusyId(null);
    }
  }

  async function handleBulk(action: string) {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    try {
      if (action === 'duplicate') {
        await Promise.all(ids.map((id) => duplicateCircular(id)));
      } else {
        await bulkAction(action, ids);
      }
      toast.success(`Bulk ${action} complete`);
      setSelected(new Set());
      void load();
    } catch {
      toast.error('Bulk action failed');
    }
  }

  const rangeStart = filteredSorted.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredSorted.length);
  const sortValue = SORT_PRESETS.find((p) => p.sort.key === sort.key && p.sort.dir === sort.dir)?.value ?? '';

  return (
    <div className="space-y-5">
      {viewId ? (
        <OfficialDocModal circularId={viewId} initialLang={docLang} onClose={() => setViewId(null)} />
      ) : null}

      <section className="page-header">
        <div>
          <h2 className="text-2xl font-bold text-navy">Circulars</h2>
          <p className="text-sm text-muted">Create, manage and track all official circulars</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center gap-1 rounded-xl border border-[#E8EEF5] bg-white p-1"
            title="Language used when opening View & Print"
          >
            <Languages size={14} className="ml-1.5 text-muted" />
            {DOC_LANGS.map(({ code, label }) => (
              <button
                key={code}
                type="button"
                onClick={() => changeDocLang(code)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                  docLang === code ? 'bg-navy text-primary' : 'text-muted hover:bg-navy/5'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button type="button" onClick={handleExport} className="btn-secondary">
            <Download size={16} /> Export
          </button>
          <Link href="/create" className="btn-primary">
            <Plus size={18} strokeWidth={2.5} /> New Circular
          </Link>
        </div>
      </section>

      {/* Modern filter card */}
      <div className="hr-card p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-[220px] flex-1">
            <FieldLabel icon={<Search size={11} />}>Search</FieldLabel>
            <div className="relative mt-1.5">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <input
                className="input h-[52px] pl-11 shadow-sm"
                placeholder="Search circular name, code, term…"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              />
            </div>
          </div>
          <FilterSelect
            label="Academic Year"
            icon={<Calendar size={11} />}
            value={filters.academicYear}
            options={academicYearOptions}
            onChange={(v) => setFilters((f) => ({ ...f, academicYear: v }))}
            fallbackLabel="All Years"
          />
          <FilterSelect
            label="Class"
            icon={<GraduationCap size={11} />}
            value={filters.className}
            options={classOptions}
            onChange={(v) => setFilters((f) => ({ ...f, className: v }))}
            fallbackLabel="All Classes"
          />
          <FilterSelect
            label="Term"
            icon={<CalendarClock size={11} />}
            value={filters.term}
            options={termOptions}
            onChange={(v) => setFilters((f) => ({ ...f, term: v }))}
            fallbackLabel="All Terms"
          />
          <FilterSelect
            label="Status"
            icon={<ListFilter size={11} />}
            value={filters.status}
            options={['DRAFT', 'PENDING', 'APPROVED', 'PUBLISHED', 'REJECTED']}
            onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
            fallbackLabel="All Status"
          />
          <div>
            <FieldLabel icon={<ArrowUpDown size={11} />}>Sort by</FieldLabel>
            <select
              className="input mt-1.5 h-[52px] min-w-[170px] text-sm shadow-sm"
              value={sortValue}
              onChange={(e) => {
                const preset = SORT_PRESETS.find((p) => p.value === e.target.value);
                if (preset) setSort(preset.sort);
              }}
            >
              {SORT_PRESETS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button type="button" onClick={resetFilters} className="btn-secondary h-[52px] shrink-0">
            <RotateCcw size={15} /> Reset
          </button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="hr-card flex flex-wrap items-center gap-2 p-3">
          <span className="text-sm font-semibold text-navy">{selected.size} selected</span>
          <button type="button" onClick={() => void handleBulk('publish')} className="btn-secondary text-xs">
            <Send size={13} /> Publish
          </button>
          <button type="button" onClick={() => void handleBulk('approve')} className="btn-secondary text-xs">
            <CheckCircle2 size={13} /> Approve
          </button>
          <button type="button" onClick={() => void handleBulk('duplicate')} className="btn-secondary text-xs">
            <Copy size={13} /> Duplicate
          </button>
          <button
            type="button"
            onClick={() => void handleBulk('delete')}
            className="btn-secondary text-xs text-rose-600 hover:border-rose-200 hover:bg-rose-50"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-center text-sm text-muted">Loading circulars…</p>
      ) : filteredSorted.length === 0 ? (
        <div className="hr-card px-6 py-16 text-center">
          <FolderOpen size={36} className="mx-auto text-muted" strokeWidth={1.5} />
          <p className="mt-3 font-semibold text-navy">No Circular Found</p>
          <p className="mt-1 text-sm text-muted">Create your first Circular to get started.</p>
          <Link href="/create" className="btn-primary mt-5 inline-flex items-center gap-2">
            <Plus size={16} /> Create Circular
          </Link>
        </div>
      ) : (
        <div className="hr-card overflow-hidden !rounded-3xl p-0">
          {/* Desktop table */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E8EEF5] bg-navy/[0.02] text-left text-[10px] font-bold uppercase tracking-wide text-muted">
                  <th className="w-10 px-4 py-3">
                    <Checkbox
                      checked={paged.length > 0 && paged.every((c) => selected.has(c.id))}
                      onChange={toggleSelectPage}
                      aria-label="Select all on this page"
                    />
                  </th>
                  <th className="px-3 py-3">
                    <SortHeader label="Circular" active={sort.key === 'className'} dir={sort.dir} onClick={() => toggleSort('className')} />
                  </th>
                  <th className="px-3 py-3">
                    <SortHeader
                      label="Academic Year"
                      active={sort.key === 'academicYear'}
                      dir={sort.dir}
                      onClick={() => toggleSort('academicYear')}
                    />
                  </th>
                  <th className="px-3 py-3">
                    <SortHeader label="Class" active={sort.key === 'className'} dir={sort.dir} onClick={() => toggleSort('className')} />
                  </th>
                  <th className="px-3 py-3">
                    <SortHeader label="Total Fee" active={sort.key === 'totalFee'} dir={sort.dir} onClick={() => toggleSort('totalFee')} />
                  </th>
                  <th className="px-3 py-3">
                    <SortHeader label="Status" active={sort.key === 'status'} dir={sort.dir} onClick={() => toggleSort('status')} />
                  </th>
                  <th className="px-3 py-3">
                    <SortHeader label="Created" active={sort.key === 'createdAt'} dir={sort.dir} onClick={() => toggleSort('createdAt')} />
                  </th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EEF5]">
                {paged.map((c) => {
                  const locked = isSharingLocked(c);
                  const canPublish = c.status === 'DRAFT' || c.status === 'APPROVED';
                  const busy = busyId === c.id;
                  return (
                    <tr key={c.id} className="transition hover:bg-[#F9FBFF]">
                      <td className="h-[84px] px-4 align-middle">
                        <Checkbox
                          checked={selected.has(c.id)}
                          onChange={() => toggleSelect(c.id)}
                          aria-label={selected.has(c.id) ? 'Deselect circular' : 'Select circular'}
                        />
                      </td>
                      <td className="h-[84px] px-3 align-middle">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                            style={{ backgroundColor: 'rgba(0,4,53,0.06)', color: '#000435' }}
                          >
                            <FileText size={16} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-muted">
                              Official Circular{c.status === 'DRAFT' ? ' · Draft' : ''}
                            </p>
                            <p className="text-sm font-bold leading-tight text-navy">{c.className}</p>
                            <p className="text-[11px] text-[#667085]">{activitySubtitle(c)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="h-[84px] px-3 align-middle">
                        <p className="text-sm text-[#344054]">{c.academicYear}</p>
                        <p className="text-[11px] text-muted">{c.term}</p>
                      </td>
                      <td className="h-[84px] px-3 align-middle">
                        <span
                          className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold"
                          style={{ backgroundColor: '#EEF5FF', color: '#175CD3' }}
                        >
                          {c.className}
                        </span>
                      </td>
                      <td className="h-[84px] px-3 align-middle">
                        <span className="inline-flex items-center gap-1.5 font-bold text-navy">
                          <Banknote size={14} className="text-muted" />
                          {circularGrandTotal(c).toLocaleString()} RWF
                        </span>
                      </td>
                      <td className="h-[84px] px-3 align-middle">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="h-[84px] px-3 align-middle">
                        <p className="text-xs text-[#344054]">{formatDate(c.createdAt)}</p>
                        <p className="text-[11px] text-muted">by {c.authorName || 'Admin'}</p>
                      </td>
                      <td className="h-[84px] px-4 align-middle">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewId(c.id)}
                            aria-label="View & Print"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E8EEF5] bg-white text-navy transition hover:-translate-y-0.5 hover:shadow-md"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewId(c.id)}
                            aria-label="Print"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E8EEF5] bg-white text-navy transition hover:-translate-y-0.5 hover:shadow-md"
                          >
                            {locked ? <FileDown size={15} /> : <Printer size={15} />}
                          </button>
                          <RowActionsMenu
                            open={menuId === c.id}
                            onToggle={() => setMenuId((id) => (id === c.id ? null : c.id))}
                            onClose={() => setMenuId(null)}
                            disabled={busy}
                          >
                            <button
                              type="button"
                              role="menuitem"
                              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-navy transition hover:bg-navy/[0.05]"
                              onClick={() => {
                                setMenuId(null);
                                router.push(`/circulars/${c.id}`);
                              }}
                            >
                              <FolderOpen size={15} className="text-muted" /> Details
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-navy hover:bg-navy/[0.04]"
                              onClick={() => {
                                setMenuId(null);
                                router.push(`/create?id=${c.id}`);
                              }}
                            >
                              <Pencil size={15} /> Edit
                            </button>
                            {canPublish ? (
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                                onClick={() => void handlePublish(c.id)}
                              >
                                <Send size={15} /> Publish
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-navy hover:bg-navy/[0.04]"
                              onClick={() => void handleDuplicate(c.id)}
                            >
                              <Copy size={15} /> Duplicate
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 border-t border-[#E8EEF5] px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                              onClick={() => void handleDelete(c.id)}
                            >
                              <Trash2 size={15} /> Delete
                            </button>
                          </RowActionsMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile / tablet card list */}
          <ul className="divide-y divide-[#E8EEF5] lg:hidden">
            {paged.map((c) => {
              const locked = isSharingLocked(c);
              const canPublish = c.status === 'DRAFT' || c.status === 'APPROVED';
              const busy = busyId === c.id;
              return (
                <li key={c.id} className="flex flex-col gap-3 px-4 py-4 transition hover:bg-[#F9FBFF] sm:px-5">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 shrink-0">
                      <Checkbox
                        checked={selected.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        aria-label={selected.has(c.id) ? 'Deselect circular' : 'Select circular'}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-muted">
                            Official Circular{c.status === 'DRAFT' ? ' · Draft' : ''}
                          </p>
                          <p className="text-lg font-bold leading-tight text-navy">{c.className}</p>
                          <p className="mt-0.5 text-xs text-muted">
                            {c.academicYear} · {c.term} · {circularGrandTotal(c).toLocaleString()} RWF
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#667085]">{activitySubtitle(c)}</p>
                        </div>
                        <div className="shrink-0">
                          <StatusBadge status={c.status} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewId(c.id)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-navy px-3 py-2.5 text-xs font-semibold text-primary transition hover:bg-navy-light"
                    >
                      <Eye size={14} /> View & Print
                    </button>
                    <RowActionsMenu
                      open={menuId === c.id}
                      onToggle={() => setMenuId((id) => (id === c.id ? null : c.id))}
                      onClose={() => setMenuId(null)}
                      disabled={busy}
                    >
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-navy hover:bg-navy/[0.04]"
                        onClick={() => {
                          setMenuId(null);
                          router.push(`/circulars/${c.id}`);
                        }}
                      >
                        <FolderOpen size={15} /> Details
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-navy hover:bg-navy/[0.04]"
                        onClick={() => {
                          setMenuId(null);
                          router.push(`/create?id=${c.id}`);
                        }}
                      >
                        <Pencil size={15} /> Edit
                      </button>
                      {canPublish ? (
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                          onClick={() => void handlePublish(c.id)}
                        >
                          <Send size={15} /> Publish
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-navy hover:bg-navy/[0.04]"
                        onClick={() => {
                          setMenuId(null);
                          setViewId(c.id);
                        }}
                      >
                        {locked ? <FileDown size={15} /> : <Printer size={15} />}
                        {locked ? 'Preview PDF' : 'Open for PDF'}
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-navy hover:bg-navy/[0.04]"
                        onClick={() => void handleDuplicate(c.id)}
                      >
                        <Copy size={15} /> Duplicate
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 border-t border-[#E8EEF5] px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                        onClick={() => void handleDelete(c.id)}
                      >
                        <Trash2 size={15} /> Delete
                      </button>
                    </RowActionsMenu>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col gap-3 border-t border-[#E8EEF5] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-xs text-muted">
              Showing {rangeStart}–{rangeEnd} of {filteredSorted.length} Circulars
            </p>
            <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}

function FieldLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-muted">
      {icon} {children}
    </label>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: 'asc' | 'desc';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 transition hover:text-navy ${active ? 'text-navy' : 'text-muted'}`}
    >
      {label}
      {active ? (
        dir === 'asc' ? (
          <ArrowUp size={12} className="text-primary" />
        ) : (
          <ArrowDown size={12} className="text-primary" />
        )
      ) : (
        <ChevronsUpDown size={12} className="opacity-50" />
      )}
    </button>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const items: (number | 'ellipsis')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) items.push(i);
  } else {
    items.push(1);
    if (page > 3) items.push('ellipsis');
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) items.push(i);
    if (page < totalPages - 2) items.push('ellipsis');
    items.push(totalPages);
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        aria-label="Previous page"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E8EEF5] bg-white text-navy transition hover:bg-navy/[0.04] disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronLeft size={15} />
      </button>
      {items.map((item, i) =>
        item === 'ellipsis' ? (
          <span key={`e-${i}`} className="px-1 text-xs text-muted">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition ${
              item === page ? 'bg-navy text-primary' : 'border border-[#E8EEF5] bg-white text-navy hover:bg-navy/[0.04]'
            }`}
          >
            {item}
          </button>
        )
      )}
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        aria-label="Next page"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E8EEF5] bg-white text-navy transition hover:bg-navy/[0.04] disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

function RowActionsMenu({
  open,
  onToggle,
  onClose,
  disabled,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) {
      setCoords(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) {
      setCoords(null);
      return;
    }

    const menuWidth = 208;
    const menuHeight = menuRef.current?.offsetHeight ?? 240;
    let left = rect.right - menuWidth;
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));

    const gap = 8;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    let top: number;
    if (spaceBelow >= menuHeight || spaceBelow >= spaceAbove) {
      top = rect.bottom + gap;
    } else {
      top = Math.max(gap, rect.top - menuHeight - gap);
    }

    setCoords({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition, children]);

  useEffect(() => {
    if (!open || !coords) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, coords, onClose]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={onToggle}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E8EEF5] bg-white text-navy transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md disabled:opacity-50"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && coords && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-[9999] w-52 overflow-hidden rounded-xl border border-[#E8EEF5] bg-white py-1.5 shadow-[0_16px_48px_rgba(15,23,42,0.18)]"
              style={{ top: coords.top, left: coords.left }}
            >
              {children}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function FilterSelect({
  label,
  icon,
  value,
  options,
  onChange,
  fallbackLabel = 'All',
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  fallbackLabel?: string;
}) {
  return (
    <div>
      <FieldLabel icon={icon}>{label}</FieldLabel>
      <select
        className="input mt-1.5 h-[52px] min-w-[140px] text-sm shadow-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{fallbackLabel}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
