'use client';

import type { ReactNode } from 'react';
import { MiniSparkline } from '@/components/mini-sparkline';

interface CircularStatCardProps {
  label: string;
  value: number;
  subtitle: string;
  icon: ReactNode;
  color: string;
  tint: string;
  trend: number[];
}

export function CircularStatCard({ label, value, subtitle, icon, color, tint, trend }: CircularStatCardProps) {
  return (
    <div className="hr-card flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl [&_svg]:h-4 [&_svg]:w-4"
            style={{ backgroundColor: tint, color }}
          >
            {icon}
          </span>
          <span className="truncate text-xs font-semibold text-muted">{label}</span>
        </div>
        <p className="mt-2 text-2xl font-extrabold tabular-nums leading-none text-navy">
          {value.toLocaleString()}
        </p>
        <p className="mt-1.5 truncate text-[11px] font-medium text-muted">{subtitle}</p>
      </div>
      <MiniSparkline values={trend} color={color} className="hidden shrink-0 sm:block" />
    </div>
  );
}
