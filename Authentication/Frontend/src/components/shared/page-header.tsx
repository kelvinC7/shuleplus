import { cn } from '@/lib/utils';
import { typography } from '@/styles/tokens';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Alias for `action` (used by several admin views). */
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  actions,
  className,
}: PageHeaderProps) {
  const headerAction = action ?? actions;
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#000435] via-[#000435] to-[#0a0f5c] px-6 py-7 text-white shadow-xl',
        className
      )}
    >
      <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[#FCB038]/15" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FCB038]/90">
              {eyebrow}
            </p>
          )}
          <h1 className={cn(typography.heading, 'mt-1 text-white')}>{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-white/70">{description}</p>}
        </div>
        {headerAction && <div className="shrink-0">{headerAction}</div>}
      </div>
    </div>
  );
}
