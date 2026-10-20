import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * PageHeader — compact white page banner matching the HR module's `.page-header`
 * card. Title/eyebrow on the left, actions on the right.
 */

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, action, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-navy/[0.06] bg-white px-5 py-4 shadow-sm sm:px-6',
        'shadow-[0_1px_2px_rgba(0,4,53,0.04),0_8px_24px_rgba(0,4,53,0.06)]',
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-0.5 text-xl font-bold tracking-tight text-navy sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
