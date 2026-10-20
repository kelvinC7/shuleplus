import { cn } from '../../lib/utils';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, action, className }: PageHeaderProps) {
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
          <h1 className="mt-1 font-montserrat text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-white/70">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
