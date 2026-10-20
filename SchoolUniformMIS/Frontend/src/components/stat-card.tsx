"use client";

import type { ReactNode } from "react";
import { TrendingUp } from "lucide-react";

export interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  hint?: string;
  icon?: ReactNode;
  valueClassName?: string;
  showTrend?: boolean;
  onClick?: () => void;
}

const NAVY = "#000435";
const GOLD = "#FCB038";

export function StatCard({
  label,
  value,
  delta,
  hint,
  icon,
  valueClassName = "text-[#000435]",
  showTrend = false,
  onClick,
}: StatCardProps) {
  const subtitle = delta ?? hint;
  const content = (
    <div className="flex items-center gap-3.5">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:text-[#FCB038]"
        style={{ backgroundColor: NAVY, color: GOLD }}
      >
        {icon ?? <TrendingUp size={20} strokeWidth={1.75} aria-hidden />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#000435]">
          {label}
        </p>
        <p
          className={`mt-1 text-2xl font-extrabold tracking-tight sm:text-[1.75rem] sm:leading-none ${valueClassName}`}
        >
          {value}
        </p>
        {subtitle ? (
          <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-[#000435]/50">
            {showTrend ? (
              <TrendingUp
                size={12}
                aria-hidden
                className="shrink-0 text-[#FCB038]"
              />
            ) : null}
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );

  const className =
    "stat-card relative flex min-h-[104px] w-full animate-scale-in flex-col rounded-md border border-border bg-white p-4 text-left shadow-soft transition hover:shadow-[0_6px_18px_-8px_rgba(0,4,53,0.14)] sm:min-h-[112px] sm:p-4";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

export function StatsGrid({
  children,
  className = "",
  columns = 4,
}: {
  children: ReactNode;
  className?: string;
  columns?: 2 | 3 | 4 | 5 | 6;
}) {
  const colClass =
    columns === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : columns === 3
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        : columns === 5
          ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
          : columns === 6
            ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6"
            : "grid-cols-2 sm:grid-cols-4";

  return (
    <div className={`grid gap-3 sm:gap-4 ${colClass} ${className}`}>
      {children}
    </div>
  );
}
