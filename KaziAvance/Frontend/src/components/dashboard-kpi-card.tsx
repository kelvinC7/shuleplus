"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowRight, MoreHorizontal, X } from "lucide-react";

export type KpiMenuRow = {
  label: string;
  value: string | number;
  hint?: string;
};

interface DashboardKpiCardProps {
  eyebrow: string;
  value: string | number;
  description: string;
  icon?: ReactNode;
  menuTitle: string;
  rows: KpiMenuRow[];
  footerHref?: string;
  footerLabel?: string;
}

export function DashboardKpiCard({
  eyebrow,
  value,
  description,
  icon,
  menuTitle,
  rows,
  footerHref,
  footerLabel = "View all",
}: DashboardKpiCardProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <div className="stat-card relative flex min-h-[128px] flex-col rounded-2xl bg-white p-4 shadow-[0_2px_14px_-4px_rgba(0,4,53,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(0,4,53,0.12)] sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-3">
            {icon ? (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-primary [&_svg]:h-[18px] [&_svg]:w-[18px]">
                {icon}
              </span>
            ) : null}
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-navy/55">
                {eyebrow}
              </p>
              <p className="mt-1.5 text-2xl font-semibold tracking-tight text-navy sm:text-[1.65rem]">
                {value}
              </p>
              <p className="mt-1.5 text-xs font-medium leading-snug text-muted">{description}</p>
            </div>
          </div>

          <button
            type="button"
            aria-label={`Open ${menuTitle} details`}
            onClick={() => setOpen(true)}
            className="rounded-lg p-1.5 text-navy/35 transition hover:bg-slate-100 hover:text-navy"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-6">
              <button
                type="button"
                className="absolute inset-0 bg-navy/45 backdrop-blur-[2px]"
                aria-label="Close"
                onClick={() => setOpen(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="kpi-detail-title"
                className="relative z-10 w-full max-w-md animate-scale-in overflow-hidden rounded-3xl bg-white shadow-[0_24px_64px_-16px_rgba(0,4,53,0.35)]"
              >
                <div className="bg-gradient-to-br from-navy via-[#12164a] to-[#1a1f5c] px-5 py-5 text-white sm:px-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {icon ? (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-primary [&_svg]:h-5 [&_svg]:w-5">
                          {icon}
                        </span>
                      ) : null}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/90">
                          Breakdown
                        </p>
                        <h2 id="kpi-detail-title" className="mt-1 text-lg font-semibold">
                          {menuTitle}
                        </h2>
                        <p className="mt-1 text-sm text-white/60">{description}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-xl p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                      aria-label="Close"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="mt-5 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-white/50">
                      {eyebrow}
                    </p>
                    <p className="mt-1 text-3xl font-semibold tracking-tight text-primary">{value}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 p-4 sm:p-5">
                  {rows.map((row) => (
                    <div
                      key={row.label}
                      className="rounded-2xl bg-[#F6F7FA] px-3.5 py-3 transition hover:bg-[#EEF0F6]"
                    >
                      <p className="text-[11px] font-medium text-muted">{row.label}</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums text-navy">{row.value}</p>
                      {row.hint ? (
                        <p className="mt-1 text-[11px] leading-snug text-navy/45">{row.hint}</p>
                      ) : null}
                    </div>
                  ))}
                </div>

                {footerHref ? (
                  <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
                    <Link
                      href={footerHref}
                      onClick={() => setOpen(false)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy/90"
                    >
                      {footerLabel}
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
