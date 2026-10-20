'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { BudgetView } from '@/modules/budget/budget-view';

function BudgetPageInner() {
  const searchParams = useSearchParams();
  return <BudgetView emphasizeUtilization={searchParams.get('view') === 'utilization'} />;
}

export default function BudgetPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">Loading…</div>}>
      <BudgetPageInner />
    </Suspense>
  );
}
