import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * PageHeader — standard page banner used at the top of every module screen.
 * Navy gradient with an amber accent, aligned to the brand.
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
        'relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#000435] via-[#000435] to-[#0a0f5c] px-6 py-7 text-white shadow-soft-lg',
        className
      )}
    >
      <div className="pointer-events-none absolute -top-12 -right-10 size-44 rounded-full bg-primary/20 blur-xl" />
      <div className="pointer-events-none absolute -bottom-16 left-1/3 size-40 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          {eyebrow ? (
            <p className="text-[11px] font-semibold tracking-[0.2em] text-primary uppercase">{eyebrow}</p>
          ) : null}
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
          {description ? <p className="mt-1.5 max-w-2xl text-sm text-white/70">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
