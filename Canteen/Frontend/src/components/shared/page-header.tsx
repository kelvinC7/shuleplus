import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  description,
  actions,
  backHref,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  backHref?: string;
  className?: string;
}) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-start justify-between gap-4', className)}>
      <div>
        {backHref ? (
          <Link href={backHref} className="mb-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        ) : null}
        <h1 className="text-3xl font-black italic tracking-tighter text-navy">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
