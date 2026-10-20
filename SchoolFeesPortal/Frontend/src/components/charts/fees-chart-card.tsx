'use client';

import { ReactNode } from 'react';

interface FeesChartCardProps {
  title: string;
  subtitle?: string;
  metric?: ReactNode;
  filter?: string;
  children: ReactNode;
  className?: string;
}

export function FeesChartCard({
  title,
  subtitle,
  metric,
  filter = 'This Year',
  children,
  className = '',
}: FeesChartCardProps) {
  return (
    <div className={`hr-card p-5 sm:p-6 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-navy sm:text-base">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
          {metric ? <div className="mt-2">{metric}</div> : null}
        </div>
        <select
          className="rounded-lg border border-border bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-navy outline-none focus:border-primary/50"
          defaultValue={filter}
          aria-label={`Filter ${title}`}
        >
          <option>This Year</option>
          <option>This Quarter</option>
          <option>This Month</option>
        </select>
      </div>
      {children}
    </div>
  );
}
