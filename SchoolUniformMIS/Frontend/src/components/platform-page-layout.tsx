"use client";

import { ReactNode } from "react";

interface PlatformPageLayoutProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  kpis?: { label: string; value: string | number; hint?: string }[];
  children: ReactNode;
}

export function PlatformPageLayout({
  title,
  subtitle,
  actions,
  kpis,
  children,
}: PlatformPageLayoutProps) {
  const showHeader = Boolean(title || subtitle || actions);

  return (
    <div className="space-y-4">
      {showHeader ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-xl font-bold tracking-tight text-navy sm:text-2xl">
                {title}
              </h2>
            ) : null}
            {subtitle ? (
              <p className="mt-1 text-sm text-muted">{subtitle}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </div>
      ) : actions ? (
        <div className="flex flex-wrap justify-end gap-2">{actions}</div>
      ) : null}

      {kpis && kpis.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-md border border-border bg-white px-4 py-3 shadow-soft"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                {kpi.label}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-navy">
                {kpi.value}
              </p>
              {kpi.hint ? (
                <p className="text-[11px] text-muted">{kpi.hint}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {children}
    </div>
  );
}
