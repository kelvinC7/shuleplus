import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ModuleCardProps {
  name: string;
  description?: string;
  href: string;
  color?: string;
  icon?: React.ReactNode;
  badge?: string;
  disabled?: boolean;
  className?: string;
}

export function ModuleCard({
  name,
  description,
  href,
  color = '#FCB038',
  icon,
  badge,
  disabled,
  className,
}: ModuleCardProps) {
  const content = (
    <Card
      className={cn(
        'group h-full transition hover:-translate-y-0.5 hover:shadow-md',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
    >
      <CardHeader className="flex flex-row items-start gap-3">
        {icon && (
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#000435]"
            style={{ backgroundColor: `${color}22` }}
          >
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <CardTitle className="truncate">{name}</CardTitle>
            {badge && (
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                {badge}
              </Badge>
            )}
          </div>
          {description && (
            <CardDescription className="mt-1 line-clamp-2">{description}</CardDescription>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <span className="text-xs font-medium text-primary group-hover:underline">Open module →</span>
      </CardContent>
    </Card>
  );

  if (disabled) return content;
  return <Link href={href}>{content}</Link>;
}
