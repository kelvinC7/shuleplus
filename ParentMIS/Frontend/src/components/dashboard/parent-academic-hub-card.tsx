'use client';

import Link from 'next/link';
import { BookOpen, CalendarDays, ChevronRight, FileText, GraduationCap } from 'lucide-react';

export function ParentAcademicHubCard({
  termLabel,
  upcomingCount,
  reportHint,
}: {
  termLabel: string;
  upcomingCount: number;
  reportHint?: string;
}) {
  const links = [
    { href: '/academic?tab=overview', label: 'Academic overview', icon: GraduationCap },
    { href: '/academic?tab=marks', label: 'Marks & courses', icon: BookOpen },
    { href: '/academic?tab=schedule', label: 'Assessment schedule', icon: CalendarDays },
    { href: '/academic?tab=reports', label: 'Report cards', icon: FileText },
  ];

  return (
    <section className="hr-card overflow-hidden rounded-[20px]">
      <div className="border-b border-border/60 bg-gradient-to-br from-navy to-[#0a1454] px-4 py-4 text-white sm:px-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/90">Shule+ academic journey</p>
        <h2 className="mt-1 text-lg font-extrabold tracking-tight">Marks, schedule & official reports</h2>
        <p className="mt-1 text-xs text-white/75">{termLabel}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
          <span className="rounded-full bg-white/10 px-2.5 py-1">{upcomingCount} upcoming</span>
          {reportHint ? <span className="rounded-full bg-primary/20 px-2.5 py-1 text-primary">{reportHint}</span> : null}
        </div>
      </div>
      <ul className="divide-y divide-border/60">
        {links.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 sm:px-5"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-navy">
                <item.icon className="size-4" />
              </span>
              <span className="flex-1 text-sm font-semibold text-navy">{item.label}</span>
              <ChevronRight className="size-4 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
