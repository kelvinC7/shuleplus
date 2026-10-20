'use client';

import { ReactNode } from 'react';

interface AssetsPageLayoutProps {
  title?: string;
  subtitle?: string;
  backHref?: string;
  actions?: ReactNode;
  kpis?: { label: string; value: string | number; hint?: string }[];
  children: ReactNode;
}

export function AssetsPageLayout({ title, subtitle, actions, kpis, children }: AssetsPageLayoutProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {title ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-navy sm:text-2xl">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
          </div>
          {actions ? (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:pb-0">
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}

      {(actions && !title) || (kpis && kpis.length > 0) ? (
        <div className="hr-card p-4 sm:p-6">
          {kpis && kpis.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              {kpis.map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 sm:px-4 sm:py-3"
                >
                  <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted sm:text-[11px]">
                    {kpi.label}
                  </p>
                  <p className="mt-1 break-words text-base font-semibold leading-tight tracking-tight tabular-nums text-navy sm:text-xl">
                    {kpi.value}
                  </p>
                  {kpi.hint && <p className="mt-0.5 text-[11px] text-muted">{kpi.hint}</p>}
                </div>
              ))}
            </div>
          )}
          {actions && !title ? (
            <div
              className={`-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:pb-0 ${kpis?.length ? 'mt-4' : ''}`}
            >
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
