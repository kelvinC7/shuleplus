'use client';

import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface SegmentTabItem<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
}

interface SegmentTabsProps<T extends string> {
  items: SegmentTabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  activeWidthPercent?: number;
}

export function SegmentTabs<T extends string>({
  items,
  value,
  onChange,
  activeWidthPercent = 45,
}: SegmentTabsProps<T>) {
  const inactiveShare = items.length > 1 ? 100 - activeWidthPercent : 100;

  return (
    <div className="flex w-full gap-2 rounded-2xl bg-slate-100/90 p-1.5">
      {items.map((item) => {
        const active = item.id === value;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            style={
              {
                ['--tab-w' as string]: active ? `${activeWidthPercent}%` : `${inactiveShare}%`,
              } as CSSProperties
            }
            className={`flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition-all sm:flex-none sm:basis-[var(--tab-w)] ${
              active
                ? 'bg-white text-navy shadow-md ring-1 ring-amber-400/35'
                : 'text-slate-500 hover:bg-white/60 hover:text-navy'
            }`}
          >
            {Icon ? <Icon size={18} className={active ? 'text-amber-600' : 'text-slate-400'} strokeWidth={2} /> : null}
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
