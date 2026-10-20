import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../primitives/card';
import { cn } from '../../lib/utils';

interface DashboardCardProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function DashboardCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: DashboardCardProps) {
  return (
    <Card className={cn('shadow-sm', className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border/60">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription className="mt-0.5">{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent className={cn('pt-4', contentClassName)}>{children}</CardContent>
    </Card>
  );
}
