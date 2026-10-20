'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

export function ModuleTile({ href, label, description, icon: Icon }: {
  href: string; label: string; description?: string; icon: LucideIcon;
}) {
  return (
    <Link href={href} className="group flex flex-col gap-4 rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-amber/40 hover:shadow-lg sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy/[0.04] text-navy group-hover:bg-navy group-hover:text-amber sm:h-12 sm:w-12">
          <Icon strokeWidth={1.75} size={22} />
        </div>
        <svg className="text-navy/15 group-hover:translate-x-0.5 group-hover:text-amber" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-navy sm:text-base">{label}</h3>
        {description && <p className="mt-1 text-xs text-muted">{description}</p>}
      </div>
    </Link>
  );
}
