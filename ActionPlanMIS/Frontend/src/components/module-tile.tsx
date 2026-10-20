'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

interface ModuleTileProps {
  href: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  badge?: string | number;
}

export function ModuleTile({ href, label, description, icon: Icon, badge }: ModuleTileProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-4 rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_8px_24px_rgba(0,4,53,0.08)] sm:p-6"
    >
      <div className="flex items-center justify-between">
        <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-navy/[0.04] text-navy transition-colors group-hover:bg-navy group-hover:text-primary sm:h-12 sm:w-12">
          <Icon strokeWidth={1.75} size={22} />
          {badge && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-navy">
              {badge}
            </span>
          )}
        </div>
        <svg
          className="text-navy/15 transition-all group-hover:translate-x-0.5 group-hover:text-primary"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold leading-snug text-navy sm:text-base">{label}</h3>
        {description && (
          <p className="text-xs leading-relaxed text-muted">{description}</p>
        )}
      </div>
    </Link>
  );
}
