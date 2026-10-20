'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Download,
  Filter,
  LineChart,
  Plus,
  Upload,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface ModuleHeaderProps {
  title: string;
  breadcrumbs?: string[];
  backHref?: string;
  icon?: React.ReactNode;
  iconClassName?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Module-level page header — back nav, icon, breadcrumbs, action buttons.
 */
export function ModuleHeader({
  title,
  breadcrumbs = [],
  backHref = '#',
  icon,
  iconClassName,
  actions,
  className,
}: ModuleHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-4 rounded-[16px] border border-border/60 bg-card px-5 py-4 shadow-soft',
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href={backHref}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Go back"
        >
          <ArrowLeft className="size-4" />
        </Link>
        {icon ? (
          <div
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-soft',
              iconClassName ?? 'bg-primary'
            )}
          >
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
          {breadcrumbs.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              {breadcrumbs.map((crumb, i) => (
                <span key={`${crumb}-${i}`}>
                  {i > 0 && <span className="mx-1.5 text-border">•</span>}
                  {crumb}
                </span>
              ))}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Pre-built Students module header */
export function StudentsModuleHeader() {
  return (
    <ModuleHeader
      title="Students"
      breadcrumbs={['Home', 'Students', 'All Students']}
      iconClassName="bg-violet-500"
      icon={
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
      }
      actions={
        <>
          <Button variant="outline" size="sm">
            <Download className="mr-1.5 size-4" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="mr-1.5 size-4" />
            Import
          </Button>
          <Button size="sm">
            <Plus className="mr-1.5 size-4" />
            Add Student
          </Button>
        </>
      }
    />
  );
}

/** Pre-built Budget Planning module header */
export function BudgetModuleHeader() {
  return (
    <ModuleHeader
      title="Budget Planning"
      breadcrumbs={['Home', 'Finance', 'Budget Planning']}
      iconClassName="bg-emerald-500"
      icon={
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      }
      actions={
        <>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Calendar className="size-4" />
            May 1, 2024 – May 31, 2024
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="mr-1.5 size-4" />
            Filter
          </Button>
          <Button size="sm" className="bg-navy text-white hover:brightness-110">
            <LineChart className="mr-1.5 size-4" />
            Generate Report
          </Button>
        </>
      }
    />
  );
}
