'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { CA_SCHOOL_FEES } from '@/components/chief-accountant/ca-school-fees-paths';

function titleFromPath(pathname: string): string {
  if (pathname.startsWith(`${CA_SCHOOL_FEES}/dashboard`)) return 'Fees dashboard';
  if (pathname.startsWith(`${CA_SCHOOL_FEES}/structures`)) return 'Fee structures';
  if (pathname.startsWith(`${CA_SCHOOL_FEES}/student-accounts`)) return 'Student fee accounts';
  if (pathname.startsWith(`${CA_SCHOOL_FEES}/invoices`)) return 'Invoices';
  if (pathname.startsWith(`${CA_SCHOOL_FEES}/requirements`)) return 'Bills & requirements';
  if (pathname.startsWith(`${CA_SCHOOL_FEES}/transactions`)) return 'Payment transactions';
  if (pathname.startsWith(`${CA_SCHOOL_FEES}/reconciliation`)) return 'Fee reconciliation';
  return 'School fees';
}

export function CaSchoolFeesPageHeader({
  title,
  actions,
}: {
  title?: string;
  actions?: ReactNode;
}) {
  const pathname = usePathname();
  const heading = title ?? titleFromPath(pathname);

  return (
    <header className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-2xl font-bold tracking-tight text-navy">{heading}</h1>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
