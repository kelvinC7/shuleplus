import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import TeacherPageShell, { tpActionBtn, tpActionBtnPrimary } from '../../components/TeacherPageShell';
import useTpAcademic from '../../hooks/useTpAcademic';
import { fetchMyCourses, tpApiError } from '../../services/teacherPortalApi';
import {
  createHomework,
  deleteHomework,
  fetchHomeworkList,
  fetchHomeworkStats,
} from '../../services/homeworkApi';
import CreateHomeworkModal from './CreateHomeworkModal';
import { TP_EMPTY } from '../../utils/tpEmpty';
import { STATUS_BADGES, TYPE_LABELS, formatDueDate, formatSubmissionCount } from './utils';

const QUICK_FILTERS = [
  { id: 'active', label: 'Active' },
  { id: 'dueToday', label: 'Due today' },
  { id: 'pendingReview', label: 'Pending review' },
  { id: 'completed', label: 'Completed' },
];

const PAGE_SIZE = 8;

const STATUS_ACCENT = {
  DRAFT: 'bg-slate-400',
  ACTIVE: 'bg-emerald-500',
  PUBLISHED: 'bg-emerald-500',
  DUE_SOON: 'bg-amber-500',
  OVERDUE: 'bg-red-500',
  CLOSED: 'bg-slate-400',
  ARCHIVED: 'bg-slate-300',
};

const iconBtn =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/[0.08] bg-white text-slate-600 shadow-sm transition hover:border-[#000435]/20 hover:text-[#000435] disabled:opacity-40';
const iconBtnDanger = `${iconBtn} hover:border-red-200 hover:bg-red-50 hover:text-red-600`;

function HomeworkRowActions({ item, onView, onEdit, onDelete, busyId }) {
  const busy = busyId === item.id;
  return (
    <div className="inline-flex flex-nowrap items-center justify-end gap-1.5">
      <button type="button" className={iconBtn} title="View" onClick={() => onView(item.id)}>
        <Eye className="h-4 w-4" strokeWidth={1.75} />
      </button>
      <button type="button" className={iconBtn} title="Edit" onClick={() => onEdit(item.id)}>
        <Pencil className="h-4 w-4" strokeWidth={1.75} />
      </button>
      <button type="button" className={iconBtnDanger} title="Delete" disabled={busy} onClick={() => onDelete(item.id)}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" strokeWidth={1.75} />}
      </button>
    </div>
  );
}

function HomeworkMobileCard({ item, index, selected, onToggle, rowNumber, actions }) {
  const accent = STATUS_ACCENT[item.status] || STATUS_ACCENT.DRAFT;
  const typeLabel = TYPE_LABELS[item.homeworkType] || item.homeworkType;

  return (
    <article className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
      <div className={`h-1 ${accent}`} aria-hidden />
      <div className="p-3">
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(item.id)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-[#000435]"
            aria-label={`Select ${item.title}`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">#{rowNumber}</span>
                <h3 className="font-semibold text-[#000435]">{item.title}</h3>
                <p className="text-xs text-slate-500">
                  {item.className} · {item.courseName}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGES[item.status] || STATUS_BADGES.DRAFT}`}>
                {(item.status || 'DRAFT').replace('_', ' ')}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5">
                <ClipboardList className="h-3 w-3" /> {typeLabel}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3 w-3" /> {formatDueDate(item.dueDate)}
              </span>
              <span>{formatSubmissionCount(item)} submitted</span>
            </div>
          </div>
        </div>
        <div className="mt-3 border-t border-black/[0.05] pt-3">{actions}</div>
      </div>
    </article>
  );
}

function PaginationBar({ page, totalPages, total, onPage }) {
  if (totalPages <= 1) {
    return (
      <p className="text-xs text-slate-500">
        {total} record{total === 1 ? '' : 's'}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-500">
        Page {page} of {totalPages} · {total} total
      </p>
      <div className="flex gap-1">
        <button type="button" className={tpActionBtn} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <button type="button" className={tpActionBtn} disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function HomeworkPage() {
  const navigate = useNavigate();
  const { term, academicYear, ready } = useTpAcademic();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [statFilter, setStatFilter] = useState('');
  const [filters, setFilters] = useState({ search: '', className: '', course: '', status: '' });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(() => new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [list, st, courses] = await Promise.all([
        fetchHomeworkList({
          academicYear: academicYear || undefined,
          term: term || undefined,
          search: filters.search || undefined,
          className: filters.className || undefined,
          course: filters.course || undefined,
          status: filters.status || undefined,
          statFilter: statFilter || undefined,
        }),
        fetchHomeworkStats(),
        fetchMyCourses({ academicYear: academicYear || undefined, term: term || undefined }).catch(() => ({ assignments: [] })),
      ]);
      setItems(Array.isArray(list) ? list : []);
      setStats(st);
      setAssignments(courses?.assignments ?? []);
      setSelected(new Set());
    } catch (err) {
      setMessage(tpApiError(err, 'Could not load homework'));
    } finally {
      setLoading(false);
    }
  }, [academicYear, term, filters, statFilter]);

  useEffect(() => {
    if (!ready) return;
    void load();
  }, [ready, load]);

  useEffect(() => {
    setPage(1);
  }, [filters, statFilter]);

  const classOptions = useMemo(() => [...new Set(assignments.map((a) => a.classLabel || a.className).filter(Boolean))], [assignments]);
  const courseOptions = useMemo(() => [...new Set(assignments.map((a) => a.subjectName).filter(Boolean))], [assignments]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, safePage]);

  const allPageSelected = pageItems.length > 0 && pageItems.every((i) => selected.has(i.id));

  function toggleOne(id) {
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
      if (allPageSelected) pageItems.forEach((i) => next.delete(i.id));
      else pageItems.forEach((i) => next.add(i.id));
      return next;
    });
  }

  async function handleCreate(payload, asDraft) {
    setSaving(true);
    setMessage(null);
    try {
      const created = await createHomework(payload);
      if (!asDraft) await publishHomework(created.id);
      setModalOpen(false);
      setMessage(asDraft ? 'Homework saved as draft.' : 'Homework published. Parents will see it in Homework Center.');
      await load();
    } catch (err) {
      setMessage(tpApiError(err, 'Could not save homework'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this homework permanently?')) return;
    setBusyId(id);
    try {
      await deleteHomework(id);
      setMessage('Homework deleted.');
      await load();
    } catch (err) {
      setMessage(tpApiError(err, 'Could not delete'));
    } finally {
      setBusyId(null);
    }
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} selected item(s)?`)) return;
    setLoading(true);
    try {
      await Promise.all([...selected].map((id) => deleteHomework(id)));
      setMessage('Selected homework deleted.');
      await load();
    } catch (err) {
      setMessage(tpApiError(err, 'Bulk delete failed'));
      setLoading(false);
    }
  }

  const rowActionsProps = {
    onView: (id) => navigate(`/homework/${id}`),
    onEdit: (id) => navigate(`/homework/${id}`),
    onDelete: handleDelete,
    busyId,
  };

  const shellStats = [
    { label: 'Active', value: loading ? TP_EMPTY : (stats?.active ?? TP_EMPTY) },
    { label: 'Due today', value: loading ? TP_EMPTY : (stats?.dueToday ?? TP_EMPTY) },
    { label: 'Pending review', value: loading ? TP_EMPTY : (stats?.pendingReview ?? TP_EMPTY) },
    { label: 'Completed', value: loading ? TP_EMPTY : (stats?.completed ?? TP_EMPTY) },
    {
      label: 'Avg score',
      value: loading ? TP_EMPTY : stats?.averageScore != null ? `${stats.averageScore}%` : TP_EMPTY,
    },
  ];

  const shellActions = (
    <>
      <button type="button" onClick={() => setModalOpen(true)} className={`${tpActionBtnPrimary} w-full sm:w-auto`}>
        <Plus className="h-4 w-4" /> Create homework
      </button>
      {selected.size > 0 && (
        <button type="button" className={`${tpActionBtn} w-full text-red-600 sm:w-auto`} onClick={() => void handleBulkDelete()}>
          <Trash2 className="h-4 w-4" /> Delete ({selected.size})
        </button>
      )}
      <div className="-mx-1 flex w-full gap-1.5 overflow-x-auto px-1 pb-0.5 sm:ml-auto sm:w-auto sm:flex-wrap sm:overflow-visible">
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setStatFilter((cur) => (cur === f.id ? '' : f.id))}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              statFilter === f.id ? 'bg-[#000435] text-white' : 'border border-black/[0.08] bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </>
  );

  return (
    <TeacherPageShell title="Homework" subtitle="Create and track homework for your classes" stats={shellStats} actions={shellActions}>
      {message && (
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</div>
      )}

      <div className="tp-card overflow-hidden p-0">
        <div className="tp-card-header flex flex-col gap-3 border-b border-black/[0.06] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div>
            <h3 className="text-sm font-semibold text-[#000435]">All assignments</h3>
            <p className="text-xs text-slate-500">
              {loading ? 'Loading…' : `${items.length} item${items.length === 1 ? '' : 's'}`}
              {academicYear && term ? ` · ${term} · ${academicYear}` : ''}
            </p>
          </div>
        </div>

        <div className="space-y-3 border-b border-black/[0.06] bg-slate-50/40 p-3 sm:p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="tp-input border-black/[0.06] bg-white pl-10 shadow-sm"
              placeholder="Search homework…"
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <select className="tp-input bg-white text-sm" value={filters.className} onChange={(e) => setFilters((p) => ({ ...p, className: e.target.value }))}>
              <option value="">All classes</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select className="tp-input bg-white text-sm" value={filters.course} onChange={(e) => setFilters((p) => ({ ...p, course: e.target.value }))}>
              <option value="">All courses</option>
              {courseOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select className="tp-input bg-white text-sm" value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}>
              <option value="">All statuses</option>
              {['DRAFT', 'ACTIVE', 'DUE_SOON', 'OVERDUE', 'CLOSED', 'ARCHIVED'].map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading homework…
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <BookOpen className="h-7 w-7 text-slate-400" />
            </div>
            <p className="mt-4 font-semibold text-[#000435]">No homework yet</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">Create an assignment for one of your classes. Parents see it in Homework Center.</p>
            <button type="button" onClick={() => setModalOpen(true)} className={`${tpActionBtnPrimary} mt-5 inline-flex items-center gap-2`}>
              <Plus className="h-4 w-4" /> Create homework
            </button>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead>
                  <tr className="border-b border-black/[0.06] bg-slate-50/90 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={togglePageAll}
                        className="h-4 w-4 rounded border-slate-300"
                        aria-label="Select all on page"
                      />
                    </th>
                    <th className="w-12 px-2 py-3">#</th>
                    <th className="px-3 py-3">Homework</th>
                    <th className="px-3 py-3">Class</th>
                    <th className="px-3 py-3">Course</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Due</th>
                    <th className="px-3 py-3">Submissions</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="w-[8.5rem] px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {pageItems.map((item, idx) => {
                    const rowNum = (safePage - 1) * PAGE_SIZE + idx + 1;
                    return (
                      <tr key={item.id} className={`transition ${selected.has(item.id) ? 'bg-[#000435]/[0.03]' : 'hover:bg-slate-50/70'}`}>
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(item.id)}
                            onChange={() => toggleOne(item.id)}
                            className="h-4 w-4 rounded border-slate-300"
                            aria-label={`Select row ${rowNum}`}
                          />
                        </td>
                        <td className="px-2 py-3 text-xs font-medium text-slate-400">{rowNum}</td>
                        <td className="px-3 py-3">
                          <Link to={`/homework/${item.id}`} className="font-medium text-[#000435] hover:underline">
                            {item.title}
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{item.className}</td>
                        <td className="px-3 py-3 text-slate-600">{item.courseName}</td>
                        <td className="px-3 py-3">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {TYPE_LABELS[item.homeworkType] || item.homeworkType}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatDueDate(item.dueDate)}</td>
                        <td className="px-3 py-3 tabular-nums text-slate-600">{formatSubmissionCount(item)}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_BADGES[item.status] || STATUS_BADGES.DRAFT}`}>
                            {(item.status || 'DRAFT').replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <HomeworkRowActions item={item} {...rowActionsProps} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 md:hidden">
              {pageItems.map((item, idx) => {
                const rowNum = (safePage - 1) * PAGE_SIZE + idx + 1;
                return (
                  <HomeworkMobileCard
                    key={item.id}
                    item={item}
                    index={idx}
                    rowNumber={rowNum}
                    selected={selected.has(item.id)}
                    onToggle={toggleOne}
                    actions={<HomeworkRowActions item={item} {...rowActionsProps} />}
                  />
                );
              })}
            </div>

            <div className="border-t border-black/[0.06] bg-white px-3 py-3 sm:px-4">
              <PaginationBar page={safePage} totalPages={totalPages} total={items.length} onPage={setPage} />
            </div>
          </>
        )}
      </div>

      <CreateHomeworkModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleCreate}
        saving={saving}
        academicYear={academicYear}
        term={term}
        assignments={assignments}
      />
    </TeacherPageShell>
  );
}
