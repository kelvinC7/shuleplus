"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Copy,
  Eye,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PlatformTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render: (row: T) => ReactNode;
}

interface PlatformDataTableProps<T> {
  columns: PlatformTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  selected?: Set<string>;
  onSelectRow?: (id: string) => void;
  onSelectAll?: () => void;
  allSelected?: boolean;
  isRowDisabled?: (row: T) => boolean;
  /** Show # column with continuous numbering across pages */
  showRowNumbers?: boolean;
  /** Soft: no outer/row borders - clean fabric-style table */
  variant?: "default" | "soft";
  page?: number;
  totalPages?: number;
  total?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  loading?: boolean;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  toolbar?: ReactNode;
  onView?: (row: T) => void;
  onRowClick?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onDuplicate?: (row: T) => void;
  onMore?: (row: T) => void;
  className?: string;
}

function pageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i++
  )
    pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

export function PlatformDataTable<T>({
  columns,
  data,
  rowKey,
  selected,
  onSelectRow,
  onSelectAll,
  allSelected,
  isRowDisabled,
  showRowNumbers = false,
  variant = "default",
  page = 1,
  totalPages,
  total,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  loading,
  emptyMessage = "No records found",
  emptyAction,
  toolbar,
  onView,
  onRowClick,
  onEdit,
  onDelete,
  onDuplicate,
  onMore,
  className,
}: PlatformDataTableProps<T>) {
  const soft = variant === "soft";
  const showSelection = Boolean(onSelectRow);
  const showActions = Boolean(
    onView || onEdit || onDelete || onDuplicate || onMore,
  );
  const resolvedTotal = total ?? data.length;
  const resolvedTotalPages =
    totalPages ?? Math.max(1, Math.ceil(resolvedTotal / pageSize));
  const from = resolvedTotal === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, resolvedTotal);
  const showPagination = Boolean(onPageChange) && resolvedTotal > 0;
  const leadCols =
    (showSelection ? 1 : 0) + (showRowNumbers ? 1 : 0) + (showActions ? 1 : 0);

  return (
    <div
      className={cn(
        "overflow-hidden bg-white",
        soft
          ? "rounded-md border border-slate-200"
          : "rounded-md border border-border shadow-soft",
        className,
      )}
    >
      {toolbar}
      <div className="overflow-x-auto">
        <table
          className={cn(
            "sp-table w-full min-w-[720px] text-left text-sm",
            soft && "sp-table-soft",
          )}
        >
          <thead>
            <tr>
              {showSelection ? (
                <th className="w-10 !pl-4 sm:!pl-5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onSelectAll}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                    aria-label="Select all"
                  />
                </th>
              ) : null}
              {showRowNumbers ? (
                <th className="w-12 !px-2 text-center">#</th>
              ) : null}
              {columns.map((col) => (
                <th key={col.key} className={col.className}>
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable ? (
                      <ChevronsUpDown size={13} className="text-muted" />
                    ) : null}
                  </span>
                </th>
              ))}
              {showActions ? (
                <th className="text-right !pr-4 sm:!pr-5">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + leadCols}
                  className="px-4 py-12 text-center text-muted"
                >
                  Loading…
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + leadCols}
                  className="px-4 py-12 text-center"
                >
                  <p className="text-muted">{emptyMessage}</p>
                  {emptyAction ? (
                    <div className="mt-4">{emptyAction}</div>
                  ) : null}
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const id = rowKey(row);
                const disabled = isRowDisabled?.(row);
                const rowNo = (page - 1) * pageSize + index + 1;
                return (
                  <tr
                    key={id}
                    className={cn(
                      selected?.has(id) && "bg-primary/5",
                      onRowClick &&
                        !disabled &&
                        "cursor-pointer transition hover:bg-slate-50/80",
                    )}
                    onClick={
                      onRowClick && !disabled
                        ? (e) => {
                            const target = e.target as HTMLElement;
                            if (
                              target.closest(
                                "button, a, input, label, select, textarea",
                              )
                            ) {
                              return;
                            }
                            onRowClick(row);
                          }
                        : undefined
                    }
                  >
                    {showSelection ? (
                      <td className="!pl-4 sm:!pl-5">
                        <input
                          type="checkbox"
                          checked={selected?.has(id)}
                          onChange={() => onSelectRow?.(id)}
                          disabled={disabled}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30 disabled:opacity-40"
                          aria-label={`Select row ${rowNo}`}
                        />
                      </td>
                    ) : null}
                    {showRowNumbers ? (
                      <td className="!px-2 text-center tabular-nums text-xs font-semibold text-muted">
                        {rowNo}
                      </td>
                    ) : null}
                    {columns.map((col) => (
                      <td key={col.key} className={col.className}>
                        {col.render(row)}
                      </td>
                    ))}
                    {showActions ? (
                      <td className="!pr-4 sm:!pr-5">
                        <div className="flex items-center justify-end gap-0.5">
                          {onView ? (
                            <button
                              type="button"
                              onClick={() => onView(row)}
                              className="rounded-md p-1.5 text-muted transition hover:bg-slate-100 hover:text-navy"
                              aria-label="View"
                            >
                              <Eye size={15} />
                            </button>
                          ) : null}
                          {onEdit ? (
                            <button
                              type="button"
                              onClick={() => onEdit(row)}
                              className="rounded-md p-1.5 text-muted transition hover:bg-slate-100 hover:text-navy"
                              aria-label="Edit"
                            >
                              <Pencil size={15} />
                            </button>
                          ) : null}
                          {onDelete ? (
                            <button
                              type="button"
                              onClick={() => onDelete(row)}
                              className="rounded-md p-1.5 text-muted transition hover:bg-rose-50 hover:text-rose-600"
                              aria-label="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          ) : null}
                          {onDuplicate ? (
                            <button
                              type="button"
                              onClick={() => onDuplicate(row)}
                              className="rounded-md p-1.5 text-muted transition hover:bg-slate-100 hover:text-navy"
                              aria-label="Duplicate"
                            >
                              <Copy size={15} />
                            </button>
                          ) : null}
                          {onMore ? (
                            <button
                              type="button"
                              onClick={() => onMore(row)}
                              className="rounded-md p-1.5 text-muted transition hover:bg-slate-100 hover:text-navy"
                              aria-label="More"
                            >
                              <MoreVertical size={15} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showPagination ? (
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 text-xs text-muted sm:px-5",
            soft ? "bg-transparent" : "border-t border-border bg-slate-50/40",
          )}
        >
          <p>
            Showing <span className="font-semibold text-navy">{from}</span> to{" "}
            <span className="font-semibold text-navy">{to}</span> of{" "}
            <span className="font-semibold text-navy">
              {resolvedTotal.toLocaleString()}
            </span>{" "}
            items
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
              className="rounded-md p-1.5 transition hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft size={15} />
            </button>
            {pageNumbers(page, resolvedTotalPages).map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-1">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange?.(p)}
                  className={cn(
                    "min-w-[32px] rounded-md px-2 py-1.5 font-semibold transition",
                    p === page
                      ? "bg-primary text-navy"
                      : "text-muted hover:bg-slate-100 hover:text-navy",
                  )}
                >
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              disabled={page >= resolvedTotalPages}
              onClick={() => onPageChange?.(page + 1)}
              className="rounded-md p-1.5 transition hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronRight size={15} />
            </button>
          </div>
          {onPageSizeChange ? (
            <label className="flex items-center gap-1.5">
              Go to page
              <input
                type="number"
                min={1}
                max={resolvedTotalPages}
                className="w-14 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-navy"
                defaultValue={page}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const n = Number((e.target as HTMLInputElement).value);
                  if (n >= 1 && n <= resolvedTotalPages) onPageChange?.(n);
                }}
              />
            </label>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Wraps existing table markup with clean brand chrome. */
export function TableCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-slate-200 bg-white",
        className,
      )}
    >
      {children}
    </div>
  );
}
