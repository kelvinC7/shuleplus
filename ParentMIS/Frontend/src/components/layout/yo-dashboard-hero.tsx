'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { ChildSwitcher } from '@/components/layout/child-switcher';

export function YoDashboardHero({
  schoolName,
  parentFirstName,
  childLine,
  liveLabel = 'Child linked',
}: {
  schoolName: string;
  parentFirstName: string;
  childLine: string;
  liveLabel?: string;
}) {
  const crest = (schoolName || 'S').trim()[0]?.toUpperCase() ?? 'S';

  return (
    <div className="relative -mx-4 overflow-hidden bg-[var(--yo-navy)] px-5 pb-20 pt-2 text-white sm:-mx-6 sm:rounded-b-[28px] sm:px-6 lg:mx-0 lg:rounded-[28px] lg:pb-16">
      <div
        className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full bg-[radial-gradient(circle,rgba(245,166,35,0.28),transparent_65%)]"
        aria-hidden
      />
      <div className="relative z-[1] flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--yo-amber)] text-sm font-extrabold text-[var(--yo-navy)]">
            {crest}
          </div>
          <div className="min-w-0">
            <small className="block truncate text-[10px] font-medium tracking-wide text-[#9fb0d3]">{schoolName}</small>
            <b className="block truncate text-sm font-bold">yoShule Parent</b>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ChildSwitcher compact onDark />
          <Link
            href="/notifications"
            className="relative flex size-10 items-center justify-center rounded-[13px] bg-white/10"
            aria-label="Notifications"
          >
            <Bell className="size-5" strokeWidth={1.8} />
            <span className="absolute right-2 top-2 size-2 rounded-full border-2 border-[var(--yo-navy)] bg-[var(--yo-amber)]" />
          </Link>
        </div>
      </div>
      <div className="relative z-[1] mt-5">
        <p className="text-xs font-medium text-[#9fb0d3]">Good day</p>
        <h2 className="text-[22px] font-bold tracking-tight">Hi, {parentFirstName}</h2>
        <p className="mt-1 text-sm text-[#c9d3ea]">{childLine}</p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-semibold">
          <span className="yo-pulse-dot size-2 rounded-full bg-[var(--yo-green)] shadow-[0_0_0_0_rgba(31,169,113,0.7)]" />
          {liveLabel}
        </div>
      </div>
    </div>
  );
}
