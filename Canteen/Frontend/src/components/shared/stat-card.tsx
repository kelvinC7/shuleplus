import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  accent = 'primary',
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  accent?: 'primary' | 'success' | 'danger' | 'info' | 'warning';
}) {
  const accents = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-emerald-100 text-emerald-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-sky-100 text-sky-700',
    warning: 'bg-amber-100 text-amber-700',
  };
  return (
    <Card className="p-5 transition-shadow hover:shadow-md hover:shadow-navblue/10">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-widest text-muted">{title}</p>
          <p className="mt-2 text-2xl font-black italic tracking-tight text-navy">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl', accents[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </Card>
  );
}
