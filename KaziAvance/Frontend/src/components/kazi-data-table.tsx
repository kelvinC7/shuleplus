"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface KaziTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  sticky?: "left" | "right";
  render: (row: T) => ReactNode;
}

interface KaziDataTableProps<T> {
  columns: KaziTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  emptyMessage?: string;
  toolbar?: ReactNode;
  mobileRow?: (row: T) => ReactNode;
  entityLabel?: string;
}

function stickyClasses(sticky?: "left" | "right", header = false) {
  if (sticky === "right") {
    return `sticky right-0 z-[2] ${header ? "bg-slate-50" : "bg-white group-hover:bg-slate-50"} shadow-[-10px_0_16px_-12px_rgba(0,4,53,0.12)]`;
  }
  if (sticky === "left") {
    return `sticky left-0 z-[2] ${header ? "bg-slate-50" : "bg-white group-hover:bg-slate-50"}`;
  }
  return "";
}

function pageWindow(page: number, totalPages: number) {
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  const from = Math.max(1, end - 4);
  for (let i = from; i <= end; i++) pages.push(i);
  return pages;
}

export function KaziDataTable<T>({
  columns,
  rows,
  rowKey,
  page = 1,
  pageSize = 10,
  total,
  onPageChange,
  onPageSizeChange,
  emptyMessage = "No records found.",
  toolbar,
  mobileRow,
  entityLabel = "records",
}: KaziDataTableProps<T>) {
  const totalCount = total ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  return (
    <div className="min-w-0 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_8px_30px_-18px_rgba(0,4,53,0.18)]">
      {toolbar ? <div className="border-b border-slate-100 p-4 sm:p-5">{toolbar}</div> : null}

      {mobileRow ? (
        <div className="space-y-3 p-4 md:hidden">
          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">{emptyMessage}</p>
          ) : (
            rows.map((row) => <div key={rowKey(row)}>{mobileRow(row)}</div>)
          )}
        </div>
      ) : null}

      <div className={`${mobileRow ? "hidden md:block" : ""} register-table-scroll max-w-full overflow-x-auto`}>
        <table className="w-max min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`whitespace-nowrap px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 ${stickyClasses(col.sticky, true)} ${col.className ?? ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-14 text-center text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={rowKey(row)} className="group border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`whitespace-nowrap px-5 py-4 text-navy ${stickyClasses(col.sticky)} ${col.className ?? ""}`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {onPageChange ? (
        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-muted">
            Showing {from} to {to} of {totalCount} {entityLabel}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {onPageSizeChange ? (
              <select
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-navy"
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
              >
                {[10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            ) : null}
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="rounded-xl border border-slate-200 p-1.5 disabled:opacity-35"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            {pageWindow(page, totalPages).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onPageChange(n)}
                className={`h-8 min-w-8 rounded-xl px-2.5 text-xs font-semibold ${
                  n === page ? "bg-navy text-white" : "border border-slate-200 text-navy hover:bg-slate-50"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="rounded-xl border border-slate-200 p-1.5 disabled:opacity-35"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AvatarInitials({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photoUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
    );
  }
  return (
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef1ff] text-xs font-bold text-navy">
      {initials}
    </span>
  );
}
