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
  /** Navy hero bar matching yoShule mobile mock */
  variant?: 'card' | 'navy';
}

export function PageHeader({ eyebrow, title, description, action, className, variant = 'navy' }: PageHeaderProps) {
  const isNavy = variant === 'navy';
  return (
    <div
      className={cn(
        isNavy
          ? '-mx-4 flex flex-wrap items-end justify-between gap-4 bg-[var(--yo-navy)] px-5 py-5 text-white sm:-mx-6 sm:rounded-b-[24px] sm:px-6 lg:mx-0 lg:rounded-[24px]'
          : cn(
              'flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-navy/[0.06] bg-white px-5 py-4 shadow-sm sm:px-6',
              'shadow-[0_1px_2px_rgba(0,4,53,0.04),0_8px_24px_rgba(0,4,53,0.06)]'
            ),
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p
            className={cn(
              'text-[11px] font-semibold uppercase tracking-[0.16em]',
              isNavy ? 'text-[var(--yo-amber)]' : 'text-primary'
            )}
          >
            {eyebrow}
          </p>
        ) : null}
        <h1 className={cn('mt-0.5 text-xl font-bold tracking-tight sm:text-2xl', isNavy ? 'text-white' : 'text-navy')}>
          {title}
        </h1>
        {description ? (
          <p className={cn('mt-1 max-w-2xl text-sm', isNavy ? 'text-[#9fb0d3]' : 'text-muted')}>{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
