"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export const TABLE_PAGE_SIZES = [10, 25, 50, 100] as const;
export type TablePageSize = (typeof TABLE_PAGE_SIZES)[number];

/**
 * Client-side pagination for list pages.
 * The procurement list endpoints return full result sets, so paginating in the
 * browser keeps search, filters and sorting consistent across pages.
 */
export function useTablePagination<T>(
  rows: T[],
  options?: { initialPageSize?: TablePageSize; resetKey?: string | number },
) {
  const { initialPageSize = 10, resetKey } = options ?? {};
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<TablePageSize>(initialPageSize);

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [resetKey, pageSize]);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, safePage, pageSize]);

  return {
    page: safePage,
    pageSize,
    total,
    totalPages,
    rows: pageRows,
    rangeStart: total === 0 ? 0 : (safePage - 1) * pageSize + 1,
    rangeEnd: Math.min(safePage * pageSize, total),
    canPrevious: safePage > 1,
    canNext: safePage < totalPages,
    setPage,
    setPageSize,
    previous: () => setPage((current) => Math.max(1, current - 1)),
    next: () => setPage((current) => Math.min(totalPages, current + 1)),
  };
}

export function TablePagination({
  page,
  pageSize,
  total,
  totalPages,
  rangeStart,
  rangeEnd,
  onPageChange,
  onPageSizeChange,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: TablePageSize) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/60 px-4 py-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="whitespace-nowrap">
          <span className="font-semibold text-navy">{rangeStart}</span>
          {total > 0 ? `–${rangeEnd}` : ""} of{" "}
          <span className="font-semibold text-navy">{total}</span>{" "}
          {total === 1 ? "record" : "records"}
        </span>
        <label className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-slate-500">Rows per page</span>
          <select
            value={pageSize}
            onChange={(event) =>
              onPageSizeChange(Number(event.target.value) as TablePageSize)
            }
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-navy outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
          >
            {TABLE_PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span className="whitespace-nowrap">
          Page <span className="font-semibold text-navy">{page}</span> of{" "}
          <span className="font-semibold text-navy">{totalPages}</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || total === 0}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-navy transition hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || total === 0}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-navy transition hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function PageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

export function ListPageHeader({
  subtitle,
  actions,
}: {
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      {subtitle ? (
        <p className="max-w-2xl text-sm text-muted">{subtitle}</p>
      ) : (
        <span />
      )}
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export type ListFilterOption = { value: string; label: string };

export function ListFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters = [],
  onReset,
  actions,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: {
    key: string;
    label: string;
    value: string;
    options: ListFilterOption[];
    onChange: (value: string) => void;
  }[];
  onReset?: () => void;
  actions?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-3 shadow-[0_1px_2px_rgba(0,4,53,0.04),0_10px_28px_-20px_rgba(0,4,53,0.25)] sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <label className="relative block min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pr-4 pl-10 text-sm text-navy outline-none transition placeholder:text-slate-400 focus:border-primary/60 focus:bg-white focus:ring-4 focus:ring-primary/10"
          />
        </label>
        {filters.map((f) => (
          <label key={f.key} className="block min-w-[150px]">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
              {f.label}
            </span>
            <select
              value={f.value}
              onChange={(e) => f.onChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-navy outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
            >
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 lg:pb-px">{actions}</div>
        ) : null}
        {onReset ? (
          <button type="button" className="btn-ghost !rounded-xl" onClick={onReset}>
            Reset
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function DataTableCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(0,4,53,0.04),0_18px_40px_-28px_rgba(0,4,53,0.28)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DataTable({
  children,
  minWidth,
}: {
  children: ReactNode;
  minWidth?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table
        className="w-full text-sm"
        style={minWidth ? { minWidth } : undefined}
      >
        {children}
      </table>
    </div>
  );
}

export function DataTableHead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
        {children}
      </tr>
    </thead>
  );
}

export function DataTableRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={cn(
        "border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/70",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function DataTableTh({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th className={cn("px-4 py-3.5 text-left font-semibold", className)}>
      {children}
    </th>
  );
}

export function DataTableTd({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={cn("px-4 py-3.5 align-middle", className)}>{children}</td>;
}

export function DataTableEmpty({
  colSpan,
  message = "No records found",
}: {
  colSpan: number;
  message?: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-20 text-center">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Search className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-navy">{message}</p>
          <p className="text-xs text-slate-500">
            Try adjusting your search or filters, then apply again.
          </p>
        </div>
      </td>
    </tr>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info" | "primary";
  className?: string;
}) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-700",
    info: "bg-sky-100 text-sky-800",
    primary: "bg-primary/25 text-navy",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EntityCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-white p-5 shadow-[0_2px_14px_-4px_rgba(0,4,53,0.08)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(0,4,53,0.12)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
