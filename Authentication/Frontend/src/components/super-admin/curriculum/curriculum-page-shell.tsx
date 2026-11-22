'use client';

import type { ReactNode } from 'react';

const AMBER = '#FCB038';
const NAVY = '#000435';

export function CurriculumPageShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-full bg-slate-50">
      <div
        className="border-b border-white/10 px-6 py-8 text-white"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #0a1454 100%)` }}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: AMBER }}>
              Shule+ · Curriculum Intelligence
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-2 max-w-2xl text-sm text-white/70">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
