import type { ReactNode } from 'react';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  delta?: string;
  hint?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: ReactNode;
  showTrend?: boolean;
  className?: string;
}

const NAVY = '#000435';
const GOLD = '#FCB038';

export function StatCard({
  label,
  value,
  change,
  delta,
  hint,
  icon,
  showTrend = false,
  className,
}: StatCardProps) {
  const subtitle = delta ?? hint ?? change;

  return (
    <div
      className={cn(
        'relative flex min-h-[112px] flex-col rounded-2xl bg-white p-4 shadow-[0_2px_14px_-4px_rgba(0,4,53,0.1)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(0,4,53,0.14)] sm:min-h-[120px] sm:p-5',
        className
      )}
    >
      <div className="flex items-center gap-3.5">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] [&_svg]:h-[20px] [&_svg]:w-[20px] [&_svg]:text-[#FCB038]"
          style={{ backgroundColor: NAVY, color: GOLD }}
        >
          {icon ?? <TrendingUp size={20} strokeWidth={1.75} aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#000435]">{label}</p>
          <p className="mt-1 font-montserrat text-2xl font-extrabold tracking-tight text-[#000435] sm:text-[1.75rem] sm:leading-none">
            {value}
          </p>
          {subtitle ? (
            <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-[#000435]/50">
              {showTrend ? <TrendingUp size={12} aria-hidden className="shrink-0 text-[#FCB038]" /> : null}
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
