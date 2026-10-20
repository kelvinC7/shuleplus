import { cn } from '@/lib/utils';
import { typography } from '@/styles/tokens';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center',
        className
      )}
    >
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {icon}
        </div>
      )}
      <p className={typography.title}>{title}</p>
      {description && <p className={cn(typography.subtitle, 'mt-1 max-w-md')}>{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
