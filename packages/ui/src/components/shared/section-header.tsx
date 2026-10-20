import { cn } from '../../lib/utils';
import { typography } from '../../lib/tokens';

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3', className)}>
      <div>
        <h2 className={typography.title}>{title}</h2>
        {description && <p className={cn(typography.subtitle, 'mt-0.5')}>{description}</p>}
      </div>
      {action}
    </div>
  );
}
