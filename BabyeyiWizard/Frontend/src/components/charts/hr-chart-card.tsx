'use client';

import { ReactNode } from 'react';
import { CardPeriodFilterTrigger } from '@/components/card-period-filter-trigger';

interface HrChartCardProps {
  title: string;
  subtitle?: string;
  metric?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Show three-dot menu to open academic year/term filter modal. */
  filterable?: boolean;
}

export function HrChartCard({
  title,
  subtitle,
  metric,
  children,
  className = '',
  filterable = true,
}: HrChartCardProps) {
  return (
    <div className={`hr-card group relative overflow-hidden p-5 sm:p-6 ${className}`}>
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-primary/[0.06] transition-transform duration-500 group-hover:scale-125"
      />

      <div className="relative mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0 pr-2">
          <h3 className="text-sm font-bold tracking-tight text-navy sm:text-base">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs text-muted">{subtitle}</p> : null}
          {metric ? <div className="mt-2.5">{metric}</div> : null}
        </div>
        {filterable ? <CardPeriodFilterTrigger /> : null}
      </div>

      <div className="relative">{children}</div>
    </div>
  );
}
