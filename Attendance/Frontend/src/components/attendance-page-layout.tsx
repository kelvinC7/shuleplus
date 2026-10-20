'use client';

import type { ReactNode } from 'react';
import { StatCard, StatsGrid } from '@/components/stat-card';

export interface AttendanceKpi {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
}

interface AttendancePageLayoutProps {
  actions?: ReactNode;
  kpis?: AttendanceKpi[];
  children: ReactNode;
}

export function AttendancePageLayout({ actions, kpis, children }: AttendancePageLayoutProps) {
  const columns =
    kpis && kpis.length <= 2
      ? 2
      : kpis && kpis.length === 3
        ? 3
        : kpis && kpis.length >= 5
          ? 4
          : 4;

  return (
    <div className="space-y-5">
      {kpis && kpis.length > 0 ? (
        <StatsGrid columns={columns as 2 | 3 | 4}>
          {kpis.map((kpi) => (
            <StatCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              hint={kpi.hint}
              icon={kpi.icon}
            />
          ))}
        </StatsGrid>
      ) : null}

      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}

      {children}
    </div>
  );
}
