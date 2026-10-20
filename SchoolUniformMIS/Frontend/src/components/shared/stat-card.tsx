import * as React from "react";
import { ArrowDownRight, ArrowUpRight, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * StatCard - dashboard metric tile (white card, navy icon box, gold glyph).
 */

interface StatCardProps {
  title?: string;
  label?: string;
  value: React.ReactNode;
  description?: string;
  delta?: string;
  hint?: string;
  icon?: React.ReactNode;
  trend?: { value: string; direction: "up" | "down" };
  showTrend?: boolean;
  className?: string;
}

const NAVY = "#000435";
const GOLD = "#FCB038";

export function StatCard({
  title,
  label,
  value,
  description,
  delta,
  hint,
  icon,
  trend,
  showTrend = false,
  className,
}: StatCardProps) {
  const heading = label ?? title ?? "";
  const subtitle = delta ?? hint ?? description;

  return (
    <div
      className={cn(
        "relative flex min-h-[112px] flex-col rounded-2xl bg-white p-4 shadow-[0_2px_14px_-4px_rgba(0,4,53,0.1)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(0,4,53,0.14)] sm:min-h-[120px] sm:p-5",
        className,
      )}
    >
      <div className="flex items-center gap-3.5">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] [&_svg]:h-[20px] [&_svg]:w-[20px] [&_svg]:text-[#FCB038]"
          style={{ backgroundColor: NAVY, color: GOLD }}
        >
          {icon ?? <TrendingUp size={20} strokeWidth={1.75} aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#000435]">
            {heading}
          </p>
          <p className="mt-1 text-2xl font-extrabold tracking-tight text-[#000435] sm:text-[1.75rem] sm:leading-none">
            {value}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {trend ? (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-semibold",
                  trend.direction === "up"
                    ? "text-[#FCB038]"
                    : "text-destructive",
                )}
              >
                {trend.direction === "up" ? (
                  <ArrowUpRight className="size-3.5" />
                ) : (
                  <ArrowDownRight className="size-3.5" />
                )}
                {trend.value}
              </span>
            ) : null}
            {subtitle ? (
              <p className="flex items-center gap-1 text-xs font-medium text-[#000435]/50">
                {showTrend && !trend ? (
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
      </div>
    </div>
  );
}
