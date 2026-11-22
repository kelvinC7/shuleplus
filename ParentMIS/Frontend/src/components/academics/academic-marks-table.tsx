'use client';

import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, formatShortDate } from '@/lib/format';
import { ACADEMIC_EMPTY, formatAssessmentTitle } from '@/lib/academic-display';
import { useClientPagination } from '@/lib/use-client-pagination';
import type { PublishedMark } from '@/lib/academic-portal-utils';

const headCell =
  'px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:px-4';
const bodyCell = 'px-3 py-3.5 align-middle text-sm sm:px-4';
const rowClass =
  'border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50/80 even:bg-slate-50/30';

function gradeBadge(grade: string) {
  if (grade.startsWith('A')) return 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80';
  if (grade.startsWith('B')) return 'bg-sky-50 text-sky-800 ring-1 ring-sky-200/80';
  if (grade.startsWith('C')) return 'bg-amber-50 text-amber-900 ring-1 ring-amber-200/80';
  return 'bg-rose-50 text-rose-800 ring-1 ring-rose-200/80';
}

function MarksPaginationFooter({
  from,
  to,
  total,
  page,
  pageCount,
  onPageChange,
}: {
  from: number;
  to: number;
  total: number;
  page: number;
  pageCount: number;
  onPageChange: (p: number) => void;
}) {
  if (total <= 0) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/80 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <p className="text-xs text-slate-600">
        Showing <span className="font-semibold tabular-nums text-slate-900">{from}</span>
        {'–'}
        <span className="font-semibold tabular-nums text-slate-900">{to}</span> of{' '}
        <span className="font-semibold tabular-nums text-slate-900">{total}</span>
      </p>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-navy transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="size-4" />
          Prev
        </button>
        <span className="min-w-[4.5rem] text-center text-xs font-medium tabular-nums text-slate-600">
          Page {page} / {pageCount}
        </span>
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-navy transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

function MarkMobileCard({
  row,
  index,
  onViewCourse,
  submittedLabel = 'Submitted',
  hideSubject = false,
  titleSubject,
}: {
  row: PublishedMark;
  index: number;
  onViewCourse?: (subject: string) => void;
  submittedLabel?: string;
  hideSubject?: boolean;
  titleSubject?: string;
}) {
  const title = formatAssessmentTitle(row.title, titleSubject ?? row.subject);
  return (
    <article className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold tabular-nums text-slate-600">
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {!hideSubject ? <p className="truncate font-bold text-navy">{row.subject}</p> : null}
              <p
                className={cn(
                  'break-words text-sm text-slate-600',
                  hideSubject ? 'font-bold text-navy' : 'mt-0.5'
                )}
              >
                {title}
              </p>
            </div>
            <p className="shrink-0 text-lg font-extrabold tabular-nums text-navy">
              {row.score}
              <span className="text-sm font-medium text-slate-400">/{row.maxScore}</span>
            </p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold uppercase tracking-wide text-slate-700">
              {row.type}
            </span>
            {row.percentage != null ? (
              <span className="font-semibold tabular-nums text-slate-700">{row.percentage}%</span>
            ) : null}
            {row.grade ? (
              <span className={cn('rounded-md px-2 py-0.5 text-xs font-bold', gradeBadge(row.grade))}>
                {row.grade}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {submittedLabel}:{' '}
            <span className="font-medium text-slate-700">
              {row.date ? formatDate(row.date) : ACADEMIC_EMPTY}
            </span>
          </p>
          {onViewCourse ? (
            <button
              type="button"
              onClick={() => onViewCourse(row.subject)}
              className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-navy px-4 text-xs font-semibold text-white transition hover:bg-navy/90"
            >
              <Eye className="size-3.5" />
              View course
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export type AcademicMarksTableProps = {
  marks: PublishedMark[];
  compact?: boolean;
  className?: string;
  pageSize?: number;
  showRowNumbers?: boolean;
  showView?: boolean;
  onViewCourse?: (subject: string) => void;
  /** When false, render all rows without pagination (e.g. small previews). */
  paginate?: boolean;
  submittedColumn?: 'short' | 'full';
  emptyMessage?: string;
  /** When set, hides the subject column (course detail view). */
  singleSubject?: string;
};

export function AcademicMarksTable({
  marks,
  compact = false,
  className,
  pageSize = 10,
  showRowNumbers = true,
  showView = false,
  onViewCourse,
  paginate = true,
  submittedColumn = 'short',
  emptyMessage = 'No marks to display.',
  singleSubject,
}: AcademicMarksTableProps) {
  const hideSubject = Boolean(singleSubject?.trim());
  const { page, setPage, pageCount, slice, from, to, total, hasPagination } = useClientPagination(
    marks,
    paginate ? pageSize : Math.max(marks.length, 1)
  );
  const rows = paginate ? slice : marks;

  if (!marks.length) {
    return (
      <p className={cn('rounded-2xl border border-slate-200/90 bg-white px-4 py-8 text-center text-sm text-slate-500', className)}>
        {emptyMessage}
      </p>
    );
  }

  const submittedHeader = submittedColumn === 'full' ? 'Date submitted' : 'Date';

  return (
    <div className={cn('overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm', className)}>
      <div className="space-y-2 p-2 md:hidden">
        {rows.map((row, i) => (
          <MarkMobileCard
            key={row.id}
            row={row}
            index={paginate ? from + i : i + 1}
            onViewCourse={showView ? onViewCourse : undefined}
            submittedLabel={submittedColumn === 'full' ? 'Date submitted' : 'Submitted'}
            hideSubject={hideSubject}
            titleSubject={singleSubject ?? row.subject}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {showRowNumbers ? (
                <th className={cn(headCell, 'w-12 text-center')}>#</th>
              ) : null}
              {!hideSubject ? <th className={headCell}>Subject</th> : null}
              {!compact ? <th className={headCell}>Assessment</th> : null}
              <th className={headCell}>Type</th>
              <th className={cn(headCell, 'text-center')}>Score</th>
              <th className={cn(headCell, 'text-center')}>Grade</th>
              <th className={cn(headCell, 'text-right')}>{submittedHeader}</th>
              {showView ? <th className={cn(headCell, 'text-right')}> </th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const rowNum = paginate ? from + i : i + 1;
              const title = formatAssessmentTitle(row.title, singleSubject ?? row.subject);
              return (
                <tr key={row.id} className={rowClass}>
                  {showRowNumbers ? (
                    <td className={cn(bodyCell, 'text-center text-xs font-bold tabular-nums text-slate-400')}>
                      {rowNum}
                    </td>
                  ) : null}
                  {!hideSubject ? (
                    <td className={cn(bodyCell, 'font-semibold text-slate-900')}>{row.subject}</td>
                  ) : null}
                  {!compact ? (
                    <td className={cn(bodyCell, 'max-w-[240px] text-slate-600')}>
                      <span className="line-clamp-2" title={title}>
                        {title}
                      </span>
                    </td>
                  ) : null}
                  <td className={bodyCell}>
                    <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {row.type}
                    </span>
                  </td>
                  <td className={cn(bodyCell, 'text-center')}>
                    <span className="inline-flex flex-col items-center gap-0.5">
                      <span className="font-bold tabular-nums text-slate-900">
                        {row.score}
                        <span className="font-medium text-slate-400">/{row.maxScore}</span>
                      </span>
                      {row.percentage != null ? (
                        <span className="text-[11px] font-medium tabular-nums text-slate-500">
                          {row.percentage}%
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className={cn(bodyCell, 'text-center')}>
                    {row.grade ? (
                      <span
                        className={cn(
                          'inline-flex min-w-[2rem] justify-center rounded-md px-2 py-0.5 text-xs font-bold',
                          gradeBadge(row.grade)
                        )}
                      >
                        {row.grade}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-400">{ACADEMIC_EMPTY}</span>
                    )}
                  </td>
                  <td className={cn(bodyCell, 'text-right text-xs text-slate-600')}>
                    {row.date ? (
                      submittedColumn === 'full' ? (
                        <span className="font-medium tabular-nums">{formatDate(row.date)}</span>
                      ) : (
                        <span className="tabular-nums text-slate-500">{formatShortDate(row.date)}</span>
                      )
                    ) : (
                      ACADEMIC_EMPTY
                    )}
                  </td>
                  {showView && onViewCourse ? (
                    <td className={cn(bodyCell, 'text-right')}>
                      <button
                        type="button"
                        onClick={() => onViewCourse(row.subject)}
                        className="inline-flex items-center gap-1 rounded-full bg-navy/10 px-3 py-1.5 text-xs font-semibold text-navy transition hover:bg-navy hover:text-white"
                      >
                        <Eye className="size-3.5" />
                        View
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {paginate && hasPagination ? (
        <MarksPaginationFooter
          from={from}
          to={to}
          total={total}
          page={page}
          pageCount={pageCount}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
