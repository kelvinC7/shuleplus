import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Archive,
  Copy,
  FileDown,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import LessonPlanningLayout from '../../components/lessonPlanning/LessonPlanningLayout';
import GenerateLessonPlanModal from '../../components/lessonPlanning/GenerateLessonPlanModal';
import ConfirmDeleteModal from '../../components/common/ConfirmDeleteModal';
import {
  archiveLessonPlan,
  deleteLessonPlan,
  duplicateLessonPlan,
  downloadLessonPlanExport,
  listLessonPlansPaginated,
} from '../../services/lessonPlanningApi';

const NAVY = '#000435';
const PAGE_SIZE = 10;

const STATUS_STYLE = {
  DRAFT: 'text-slate-600 ring-slate-200',
  SUBMITTED: 'text-slate-700 ring-slate-200',
  APPROVED: 'text-slate-700 ring-slate-200',
  ARCHIVED: 'text-slate-500 ring-slate-200',
};

function lessonLabel(p) {
  const num = p.lesson?.lessonNumber;
  const title = p.lesson?.title || p.planContent?.preparation?.lessonTitle?.value || 'Lesson plan';
  return num ? `${num} · ${title}` : title;
}

export default function AllLessonPlansPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [data, setData] = useState({ items: [], total: 0, page: 1, totalPages: 1, summary: {} });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listLessonPlansPaginated({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        search: search || undefined,
        status: status || undefined,
      });
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const s = data.summary || {};
  const rowOffset = (data.page - 1) * PAGE_SIZE;

  return (
    <LessonPlanningLayout
      title="All lesson plans"
      subtitle="Your saved plans."
      actions={
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-md px-4 py-2 text-sm font-semibold text-white"
          style={{ background: NAVY }}
        >
          Generate new
        </button>
      }
    >
      <p className="text-sm text-slate-600">
        <span className="tabular-nums font-medium text-slate-900">{s.total ?? data.total}</span> plans
        {(s.draft != null || s.submitted != null) && (
          <>
            {' · '}
            {s.draft ?? 0} draft · {s.submitted ?? 0} submitted
            {s.taught != null ? ` · ${s.taught} taught` : ''}
          </>
        )}
      </p>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-3 py-3 sm:flex-row sm:items-center sm:px-4">
          <input
            className="h-9 w-full flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200"
            placeholder="Search title, class, subject…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm sm:w-40"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        {/* Mobile list */}
        <div className="divide-y divide-slate-100 md:hidden">
          {loading ? (
            <div className="flex justify-center py-14">
              <Loader2 className="animate-spin" style={{ color: NAVY }} size={28} />
            </div>
          ) : data.items.length === 0 ? (
            <EmptyRow />
          ) : (
            data.items.map((p, idx) => (
              <article key={p.id} className="px-3 py-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold tabular-nums text-slate-600">
                    {rowOffset + idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#000435]">{lessonLabel(p)}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {p.subjectLabel} · {p.className || p.gradeLabel || '–'}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <StatusBadge status={p.status} taught={p.taughtAt} />
                      <span className="text-xs text-slate-400">{p.durationMinutes} min</span>
                    </div>
                  </div>
                  <PlanActions plan={p} onChanged={load} onDeleteRequest={setDeleteTarget} align="right" />
                </div>
              </article>
            ))
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="w-14 px-4 py-2.5 text-center">No.</th>
                <th className="px-4 py-2.5">Lesson</th>
                <th className="px-4 py-2.5">Course / class</th>
                <th className="px-4 py-2.5">Unit</th>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Duration</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="w-14 px-2 py-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <Loader2 className="mx-auto animate-spin" style={{ color: NAVY }} size={28} />
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyRow />
                  </td>
                </tr>
              ) : (
                data.items.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 text-center text-xs font-semibold tabular-nums text-slate-500">
                      {rowOffset + idx + 1}
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-2.5 font-medium text-[#000435]">{lessonLabel(p)}</td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {p.subjectLabel || '–'}
                      <span className="text-slate-300"> · </span>
                      {p.className || p.gradeLabel || '–'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {p.lesson?.unit ? `Unit ${p.lesson.unit.unitNumber}` : '–'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                      {p.lessonDate ? new Date(p.lessonDate).toLocaleDateString() : '–'}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-600">{p.durationMinutes} min</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={p.status} taught={p.taughtAt} />
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <PlanActions plan={p} onChanged={load} onDeleteRequest={setDeleteTarget} align="right" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PlansPagination data={data} page={page} setPage={setPage} pageSize={PAGE_SIZE} />
      </div>

      <GenerateLessonPlanModal open={modalOpen} onClose={() => setModalOpen(false)} />

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Delete lesson plan?"
        description="This plan will be removed from your list. You cannot restore it after deletion."
        itemLabel={deleteTarget ? lessonLabel(deleteTarget) : undefined}
        loading={deleting}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleting(true);
          try {
            await deleteLessonPlan(deleteTarget.id);
            setDeleteTarget(null);
            await load();
          } finally {
            setDeleting(false);
          }
        }}
      />
    </LessonPlanningLayout>
  );
}

function EmptyRow() {
  return <p className="py-12 text-center text-sm text-slate-500">No lesson plans match your filters.</p>;
}

function StatusBadge({ status, taught }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${STATUS_STYLE[status] || 'text-slate-600 ring-slate-200'}`}
    >
      {status}
      {taught ? ' · taught' : ''}
    </span>
  );
}

function PlansPagination({ data, page, setPage, pageSize }) {
  const totalPages = Math.max(1, data.totalPages || 1);
  const from = data.total === 0 ? 0 : (data.page - 1) * pageSize + 1;
  const to = Math.min(data.page * pageSize, data.total);

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (totalPages <= 7 || i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-slate-100 px-3 py-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <span>
        Showing <strong className="font-semibold text-[#000435]">{from}</strong>–
        <strong className="font-semibold text-[#000435]">{to}</strong> of{' '}
        <strong className="font-semibold text-[#000435]">{data.total}</strong>
      </span>
      <div className="flex flex-wrap items-center justify-end gap-1">
        <PageBtn disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Prev
        </PageBtn>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`e-${i}`} className="px-1 text-slate-400">
              …
            </span>
          ) : (
            <PageBtn key={p} active={p === page} onClick={() => setPage(p)}>
              {p}
            </PageBtn>
          )
        )}
        <PageBtn disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Next
        </PageBtn>
      </div>
    </div>
  );
}

function PageBtn({ children, disabled, active, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`min-w-[2rem] rounded-md px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${
        active ? 'bg-[#000435] text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

function PlanActions({ plan, onChanged, onDeleteRequest, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const itemCls =
    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50';

  return (
    <div ref={ref} className={`relative inline-block ${align === 'right' ? 'text-right' : ''}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-[#000435]"
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal size={16} />
      </button>
      {open ? (
        <div
          role="menu"
          className={`absolute z-30 mt-1 min-w-[11.5rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <Link
            role="menuitem"
            to={`/lesson-plans/${plan.id}`}
            className={itemCls}
            onClick={() => setOpen(false)}
          >
            <Pencil size={15} className="shrink-0 text-slate-400" />
            Open / edit
          </Link>
          <button
            type="button"
            role="menuitem"
            className={itemCls}
            onClick={async () => {
              await duplicateLessonPlan(plan.id);
              setOpen(false);
              onChanged();
            }}
          >
            <Copy size={15} className="shrink-0 text-slate-400" />
            Duplicate
          </button>
          <button
            type="button"
            role="menuitem"
            className={itemCls}
            onClick={async () => {
              await downloadLessonPlanExport(plan.id, 'pdf');
              setOpen(false);
            }}
          >
            <FileDown size={15} className="shrink-0 text-slate-400" />
            Download PDF
          </button>
          <button
            type="button"
            role="menuitem"
            className={itemCls}
            onClick={async () => {
              await downloadLessonPlanExport(plan.id, 'docx');
              setOpen(false);
            }}
          >
            <FileDown size={15} className="shrink-0 text-slate-400" />
            Download DOCX
          </button>
          <button
            type="button"
            role="menuitem"
            className={itemCls}
            onClick={async () => {
              await archiveLessonPlan(plan.id);
              setOpen(false);
              onChanged();
            }}
          >
            <Archive size={15} className="shrink-0 text-slate-400" />
            Archive
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
            onClick={() => {
              setOpen(false);
              onDeleteRequest?.(plan);
            }}
          >
            <Trash2 size={15} className="shrink-0" />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}
