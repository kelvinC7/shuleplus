'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import type { LinkedStudent } from '@/types';
import { cn } from '@/lib/utils';

function formatDashboardDate(d = new Date()) {
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function childShortName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] ?? 'Child';
  return parts[0];
}

export function YoDashboardHead({
  parentFirstName,
  activeChildName,
  schoolName,
  linkedStudents,
  activeStudentId,
  onSelectChild,
}: {
  parentFirstName: string;
  activeChildName: string;
  schoolName: string;
  linkedStudents: LinkedStudent[];
  activeStudentId: string | null;
  onSelectChild: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4 min-[700px]:flex-row min-[700px]:items-end min-[700px]:justify-between">
      <div className="min-w-0">
        <div className="mb-3 flex items-center justify-between gap-3 lg:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/90 p-1 shadow-sm ring-1 ring-[var(--yo-line)]/80">
              <Image src="/logo.png" alt="Shule+" width={72} height={72} className="h-full w-auto object-contain" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold text-[var(--yo-muted)]">{schoolName}</p>
              <p className="truncate text-xs font-bold text-[var(--yo-navy)]">Parent Console</p>
            </div>
          </div>
          <Link
            href="/notifications"
            className="relative flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-[var(--yo-navy)] text-white"
            aria-label="Notifications"
          >
            <Bell className="size-[18px]" strokeWidth={1.8} />
            <span className="absolute right-2 top-2 size-2 rounded-full border-2 border-[var(--yo-navy)] bg-[var(--yo-amber)]" />
          </Link>
        </div>
        <p className="text-[13px] font-semibold text-[var(--yo-muted)]">{formatDashboardDate()}</p>
        <h1 className="mt-0.5 text-[clamp(1.5rem,4.5vw,1.75rem)] font-extrabold tracking-[-0.03em] text-[var(--yo-navy)]">
          Hi, {parentFirstName}
        </h1>
        <p className="mt-1 text-sm text-[var(--yo-muted)]">
          Viewing <span className="font-semibold text-[var(--yo-navy)]">{activeChildName}</span>
        </p>
      </div>

      {linkedStudents.length > 0 ? (
        <div
          className="inline-flex max-w-full self-start overflow-x-auto rounded-2xl border-[1.5px] border-[var(--yo-line)] bg-white p-1 shadow-sm"
          role="tablist"
          aria-label="Choose a child"
        >
          {linkedStudents.map((child) => {
            const selected = child.id === activeStudentId;
            return (
              <button
                key={child.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onSelectChild(child.id)}
                className={cn(
                  'shrink-0 rounded-xl px-4 py-2 text-[13px] font-bold transition',
                  selected
                    ? 'bg-[var(--yo-amber)] text-[var(--yo-navy)] shadow-sm'
                    : 'text-[var(--yo-muted)] hover:text-[var(--yo-navy)]'
                )}
              >
                {childShortName(child.fullName)}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
