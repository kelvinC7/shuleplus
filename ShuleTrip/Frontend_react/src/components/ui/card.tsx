import type { ComponentType, HTMLAttributes } from 'react';
import { cn } from '@/shared/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card',
        className
      )}
      {...props}
    />
  );
}

const toneStyles = {
  navy: { wrap: 'bg-navy/5 text-navy', ring: 'ring-navy/10' },
  amber: { wrap: 'bg-amber/20 text-amber-900', ring: 'ring-amber/30' },
  green: { wrap: 'bg-emerald-50 text-emerald-700', ring: 'ring-emerald-200/60' },
  red: { wrap: 'bg-red-50 text-red-700', ring: 'ring-red-200/60' },
  blue: { wrap: 'bg-blue-50 text-blue-700', ring: 'ring-blue-200/60' },
} as const;

export function KpiCard({
  label,
  value,
  hint,
  tone = 'navy',
  icon: Icon,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: keyof typeof toneStyles;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
}) {
  const styles = toneStyles[tone];

  return (
    <Card className={cn('group flex items-start gap-4 transition hover:-translate-y-0.5 hover:shadow-elevated', className)}>
      <div
        className={cn(
          'grid h-12 w-12 shrink-0 place-items-center rounded-xl text-sm font-bold ring-1',
          styles.wrap,
          styles.ring
        )}
      >
        {Icon ? <Icon className="h-5 w-5" /> : <span className="text-base font-extrabold">#</span>}
      </div>
      <div className="min-w-0">
        <p className="text-3xl font-extrabold leading-none tracking-tight text-slate-900">{value}</p>
        <p className="mt-1.5 text-sm font-semibold text-slate-600">{label}</p>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </div>
    </Card>
  );
}
