'use client';

import type { ReactNode } from 'react';

type RepPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function RepPageHeader({ eyebrow, title, description, action }: RepPageHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-navy/10 bg-gradient-to-br from-[#000435] via-[#0a1050] to-[#1a2a6c] px-6 py-7 text-white shadow-xl">
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#FCB038]/15 blur-2xl" />
      <div className="absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          {eyebrow ? (
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#FCB038]">{eyebrow}</p>
          ) : null}
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-[1.65rem]">{title}</h1>
          {description ? <p className="mt-2 max-w-2xl text-sm text-white/70">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
