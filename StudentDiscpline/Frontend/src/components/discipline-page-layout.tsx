'use client';

import { ReactNode } from 'react';

interface DisciplinePageLayoutProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  kpis?: { label: string; value: string | number; hint?: string }[];
  children: ReactNode;
}

export function DisciplinePageLayout({ title, subtitle, actions, kpis, children }: DisciplinePageLayoutProps) {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#000435] sm:text-2xl">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>

      {kpis && kpis.length > 0 ? (
        <div className="hr-card p-5 sm:p-6">
          <div className={`grid grid-cols-2 gap-3 ${kpis.length > 4 ? 'sm:grid-cols-3 xl:grid-cols-6' : 'sm:grid-cols-4'}`}>
            {kpis.map((kpi) => (
              <div key={kpi.label} className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{kpi.label}</p>
                <p className="mt-1 text-2xl font-bold text-[#000435]">{kpi.value}</p>
                {kpi.hint ? <p className="text-[11px] text-slate-500">{kpi.hint}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {children}
    </div>
  );
}
