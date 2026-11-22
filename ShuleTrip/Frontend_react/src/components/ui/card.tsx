import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl border border-line bg-white p-5 shadow-sm', className)}
      {...props}
    />
  );
}

export function KpiCard({
  label,
  value,
  hint,
  tone = 'navy',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'navy' | 'amber' | 'green' | 'red' | 'blue';
}) {
  const toneClass = {
    navy: 'bg-slate-100 text-navy',
    amber: 'bg-amber-soft text-amber-900',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-blue-50 text-blue-700',
  }[tone];

  return (
    <Card className="flex gap-4">
      <div className={cn('grid h-11 w-11 place-items-center rounded-xl text-sm font-bold', toneClass)}>
        #
      </div>
      <div>
        <p className="text-2xl font-extrabold tracking-tight text-slate-900">{value}</p>
        <p className="text-sm font-semibold text-slate-600">{label}</p>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </div>
    </Card>
  );
}
