'use client';

import { ReactNode } from 'react';
import { StatsGrid, StatCard } from './stat-card';

interface KpiItem {
  label: string;
  value: number | string;
  icon: ReactNode;
  hint?: string;
  trend?: 'up' | 'down' | 'neutral';
}

interface LibPageLayoutProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  kpis?: KpiItem[];
  children: ReactNode;
  toolbar?: ReactNode;
}

export function LibPageLayout({ title, subtitle, actions, kpis, children, toolbar }: LibPageLayoutProps) {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Library</p>
          <h1 className="text-xl font-bold text-navy">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {kpis && kpis.length > 0 && (
        <StatsGrid>
          {kpis.map((kpi, i) => (
            <StatCard key={i} {...kpi} />
          ))}
        </StatsGrid>
      )}

      {toolbar && <div className="flex flex-wrap items-center gap-3">{toolbar}</div>}

      {children}
    </div>
  );
}
