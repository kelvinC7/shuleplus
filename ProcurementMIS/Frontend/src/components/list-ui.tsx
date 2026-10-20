"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

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
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-3 shadow-[0_2px_14px_-4px_rgba(0,4,53,0.08)] sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <label className="relative block min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-xl border border-border bg-[#f8fafc] py-2.5 pr-4 pl-10 text-sm text-navy outline-none transition focus:border-primary/50 focus:bg-white"
          />
        </label>
        {filters.map((f) => (
          <label key={f.key} className="block min-w-[160px]">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
              {f.label}
            </span>
            <select
              value={f.value}
              onChange={(e) => f.onChange(e.target.value)}
              className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-navy outline-none focus:border-primary/50"
            >
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ))}
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
        "overflow-hidden rounded-2xl border border-border bg-white shadow-[0_2px_14px_-4px_rgba(0,4,53,0.08)]",
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
      <tr className="border-b border-border bg-[#f8fafc] text-[11px] font-semibold uppercase tracking-wide text-muted">
        {children}
      </tr>
    </thead>
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
    <th className={cn("px-4 py-3 text-left font-semibold", className)}>
      {children}
    </th>
  );
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
      <td colSpan={colSpan} className="px-4 py-16 text-center text-muted">
        {message}
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
