'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@shuleplus/ui';

interface HrKpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  accent?: 'amber' | 'emerald' | 'blue' | 'violet';
  className?: string;
}

const accents = {
  amber: {
    icon: 'bg-amber-500/10 text-amber-600',
    bar: 'from-amber-400 to-[#fcb038]',
  },
  emerald: {
    icon: 'bg-emerald-500/10 text-emerald-600',
    bar: 'from-emerald-400 to-emerald-500',
  },
  blue: {
    icon: 'bg-blue-500/10 text-blue-600',
    bar: 'from-blue-400 to-blue-500',
  },
  violet: {
    icon: 'bg-violet-500/10 text-violet-600',
    bar: 'from-violet-400 to-violet-500',
  },
};

export function HrKpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = 'amber',
  className,
}: HrKpiCardProps) {
  const tone = accents[accent];

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md',
        className
      )}
    >
      <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-80', tone.bar)} />
      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 font-montserrat text-3xl font-bold tracking-tight text-navy">{value}</p>
          {hint && <p className="mt-1.5 text-xs font-medium text-muted-foreground">{hint}</p>}
        </div>
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', tone.icon)}>
          <Icon size={20} strokeWidth={1.75} />
        </span>
      </div>
    </div>
  );
}
