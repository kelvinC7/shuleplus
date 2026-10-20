import type { LucideIcon } from 'lucide-react';
import { TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  delta?: string;
  icon?: LucideIcon;
  /** Kept for API compatibility — cards share one navy/gold treatment */
  highlight?: boolean;
  className?: string;
}

const NAVY = '#000435';
const GOLD = '#FCB038';

export function KpiCard({ label, value, hint, delta, icon: Icon, className = '' }: KpiCardProps) {
  const meta = hint ?? delta;
  return (
    <div
      className={`relative flex min-h-[112px] flex-col rounded-2xl bg-white p-4 shadow-[0_2px_14px_-4px_rgba(0,4,53,0.1)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(0,4,53,0.14)] sm:min-h-[120px] sm:p-5 ${className}`}
    >
      <div className="flex items-center gap-3.5">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]"
          style={{ backgroundColor: NAVY, color: GOLD }}
        >
          {Icon ? (
            <Icon size={20} strokeWidth={1.75} />
          ) : (
            <TrendingUp size={20} strokeWidth={1.75} aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#000435]">{label}</p>
          <p className="mt-1 text-2xl font-extrabold tracking-tight text-[#000435] sm:text-[1.75rem] sm:leading-none">
            {value}
          </p>
          {meta ? <p className="mt-1.5 text-xs font-medium text-[#000435]/50">{meta}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function KpiRow({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">{children}</div>;
}
