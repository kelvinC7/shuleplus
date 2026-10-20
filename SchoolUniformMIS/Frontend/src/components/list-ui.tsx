"use client";

import type { ReactNode } from "react";
import { CalendarRange, Filter, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function inDateRange(
  iso: string | null | undefined,
  from: string,
  to: string,
): boolean {
  if (!from && !to) return true;
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  if (from) {
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    if (d < start) return false;
  }
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (d > end) return false;
  }
  return true;
}

export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  onClear,
  label = "Date range",
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onClear?: () => void;
  label?: string;
}) {
  const active = Boolean(from || to);
  return (
    <div className="rounded-xl border border-border bg-white p-3 shadow-soft sm:p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-0 items-center gap-2 sm:min-w-[140px]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
            <CalendarRange className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              {label}
            </p>
            <p className="text-xs text-muted">
              {active ? "Custom period" : "All dates"}
            </p>
          </div>
        </div>
        <label className="block min-w-[140px] flex-1">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
            From
          </span>
          <input
            type="date"
            className="input !rounded-lg !py-2"
            value={from}
            onChange={(e) => onFromChange(e.target.value)}
          />
        </label>
        <label className="block min-w-[140px] flex-1">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
            To
          </span>
          <input
            type="date"
            className="input !rounded-lg !py-2"
            value={to}
            min={from || undefined}
            onChange={(e) => onToChange(e.target.value)}
          />
        </label>
        {onClear && active ? (
          <button
            type="button"
            className="btn-ghost !rounded-lg !px-3"
            onClick={onClear}
          >
            <X size={15} /> Clear dates
          </button>
        ) : null}
      </div>
    </div>
  );
}

export type BadgeTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "primary"
  | "purple"
  | "pink"
  | "sky";

const TONE: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-700",
  info: "bg-sky-100 text-sky-800",
  primary: "bg-primary/25 text-navy",
  purple: "bg-violet-100 text-violet-800",
  pink: "bg-pink-100 text-pink-800",
  sky: "bg-cyan-100 text-cyan-800",
};

export function StatusBadge({
  children,
  tone = "neutral",
  className,
  icon,
  pill = false,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  icon?: ReactNode;
  pill?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold tracking-wide",
        pill ? "rounded-full" : "rounded-md",
        TONE[tone],
        className,
      )}
    >
      {icon ? (
        <span className="shrink-0 [&_svg]:h-3 [&_svg]:w-3">{icon}</span>
      ) : null}
      {children}
    </span>
  );
}

const CATEGORY_TONES: BadgeTone[] = [
  "purple",
  "sky",
  "pink",
  "info",
  "primary",
  "warning",
  "success",
  "neutral",
];

export function categoryTone(name?: string | null): BadgeTone {
  if (!name) return "neutral";
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = (hash + name.charCodeAt(i) * (i + 1)) % CATEGORY_TONES.length;
  return CATEGORY_TONES[hash] ?? "neutral";
}

const AVATAR_PALETTE = [
  "bg-sky-500 text-white",
  "bg-teal-500 text-white",
  "bg-emerald-500 text-white",
  "bg-indigo-500 text-white",
  "bg-violet-500 text-white",
  "bg-rose-500 text-white",
  "bg-amber-500 text-navy",
  "bg-cyan-600 text-white",
] as const;

export function avatarTone(seed?: string | null): string {
  const s = (seed ?? "?").trim() || "?";
  let hash = 0;
  for (let i = 0; i < s.length; i++)
    hash = (hash + s.charCodeAt(i) * (i + 3)) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[hash] ?? AVATAR_PALETTE[0];
}

export function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const sec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (sec < 60) return `${sec || 1} sec ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} day${day === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

export interface ListFilterOption {
  value: string;
  label: string;
}

export interface ListKpi {
  label: string;
  value: string | number;
  tone?: BadgeTone;
  icon?: ReactNode;
}

export function ListKpiStrip({ items }: { items: ListKpi[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3.5 shadow-soft"
        >
          {item.icon ? (
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg [&_svg]:h-[18px] [&_svg]:w-[18px]",
                item.tone === "success"
                  ? "bg-emerald-100 text-emerald-700"
                  : item.tone === "warning"
                    ? "bg-amber-100 text-amber-800"
                    : item.tone === "danger"
                      ? "bg-red-100 text-red-700"
                      : item.tone === "purple"
                        ? "bg-violet-100 text-violet-700"
                        : item.tone === "info"
                          ? "bg-sky-100 text-sky-800"
                          : item.tone === "primary"
                            ? "bg-primary/25 text-navy"
                            : "bg-slate-100 text-navy",
              )}
            >
              {item.icon}
            </span>
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted">
              {item.label}
            </p>
            <p className="text-xl font-bold tabular-nums leading-tight text-navy">
              {item.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters = [],
  onReset,
  onApply,
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
  onApply?: () => void;
  actions?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-3 shadow-soft sm:p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className="input !rounded-lg pl-9"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onReset ? (
              <button
                type="button"
                className="btn-ghost !rounded-lg !px-3"
                onClick={onReset}
              >
                Reset
              </button>
            ) : null}
            {onApply ? (
              <button
                type="button"
                className="btn-primary !rounded-lg !py-2"
                onClick={onApply}
              >
                <Filter size={15} /> Apply
              </button>
            ) : null}
            {actions}
          </div>
        </div>

        {filters.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filters.map((f) => (
              <label key={f.key} className="block min-w-0">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {f.label}
                </span>
                <select
                  className="input !rounded-lg !py-2"
                  value={f.value}
                  onChange={(e) => f.onChange(e.target.value)}
                >
                  <option value="">All</option>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ListToolbar({
  resultLabel,
  resultHint,
  icon,
  pageSize,
  onPageSizeChange,
  children,
}: {
  resultLabel: string;
  resultHint?: string;
  icon?: ReactNode;
  pageSize?: number;
  onPageSizeChange?: (n: number) => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        {icon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-navy [&_svg]:h-4 [&_svg]:w-4">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="text-sm font-bold text-navy">{resultLabel}</p>
          {resultHint ? (
            <p className="text-xs text-muted">{resultHint}</p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange && pageSize != null ? (
          <label className="flex items-center gap-2 text-xs font-medium text-muted">
            Show
            <select
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-navy"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export function ItemThumb({
  src,
  fallback,
  className,
}: {
  src?: string | null;
  fallback?: string;
  className?: string;
}) {
  const letter = (fallback ?? "?").trim().charAt(0).toUpperCase() || "?";
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={cn(
          "h-10 w-10 rounded-lg object-cover ring-1 ring-border",
          className,
        )}
      />
    );
  }
  return (
    <span
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold shadow-sm",
        avatarTone(fallback),
        className,
      )}
    >
      {letter}
    </span>
  );
}

export function OutlineActionLink({
  href,
  children,
  icon,
}: {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-navy transition hover:border-navy/20 hover:bg-slate-50"
    >
      {icon}
      {children}
    </a>
  );
}
