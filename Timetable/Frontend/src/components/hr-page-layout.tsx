'use client';

import { ReactNode } from 'react';

interface HrPageLayoutProps {
  title?: string;
  description?: string;
  subtitle?: string;
  backHref?: string;
  actions?: ReactNode;
  kpis?: { label: string; value: string | number; hint?: string }[];
  children: ReactNode;
}

export function HrPageLayout({ title, description, subtitle, actions, kpis, children }: HrPageLayoutProps) {
  return (
    <div className="space-y-6">
      {(title || description || subtitle) && (
        <div>
          {title ? <h1 className="text-2xl font-extrabold text-navy">{title}</h1> : null}
          {(description || subtitle) ? (
            <p className="mt-1 text-sm text-muted">{description ?? subtitle}</p>
          ) : null}
        </div>
      )}
      {(actions || (kpis && kpis.length > 0)) && (
        <div className="hr-card p-5 sm:p-6">
          {kpis && kpis.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {kpis.map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-xl border border-border bg-slate-50 px-4 py-3"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    {kpi.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-navy">{kpi.value}</p>
                  {kpi.hint && <p className="text-[11px] text-muted">{kpi.hint}</p>}
                </div>
              ))}
            </div>
          )}
          {actions ? <div className={`flex flex-wrap gap-2 ${kpis?.length ? 'mt-4' : ''}`}>{actions}</div> : null}
        </div>
      )}
      {children}
    </div>
  );
}
