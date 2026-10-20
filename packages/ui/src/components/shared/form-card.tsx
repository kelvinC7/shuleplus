import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../primitives/card';
import { cn } from '../../lib/utils';

interface FormCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function FormCard({ title, description, children, footer, className }: FormCardProps) {
  return (
    <Card className={cn('shadow-sm', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
      {footer && <div className="border-t border-border/60 px-6 py-4">{footer}</div>}
    </Card>
  );
}
