export function StatCard({
  title,
  value,
  subtitle,
  trend,
  accent,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  accent?: 'green' | 'red' | 'amber' | 'navy' | 'sky';
}) {
  const colors = {
    green: 'border-emerald-200/80 bg-emerald-50/80',
    red: 'border-red-200/80 bg-red-50/80',
    amber: 'border-amber-200/80 bg-amber-50/80',
    sky: 'border-sky-200/80 bg-sky-50/80',
    navy: 'border-border/60 bg-white',
  };
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${colors[accent ?? 'navy']}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      <p className="mt-2 font-montserrat text-3xl font-bold text-navy">{value}</p>
      {trend && <p className="mt-1 text-sm font-medium text-emerald-600">{trend}</p>}
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-montserrat text-2xl font-bold text-navy">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
      <p className="font-semibold text-navy">{title}</p>
      {description && <p className="mt-2 text-sm text-muted">{description}</p>}
    </div>
  );
}
