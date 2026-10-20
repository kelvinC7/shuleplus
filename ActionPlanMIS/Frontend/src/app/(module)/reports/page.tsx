'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportsView } from '@/modules/reports/reports-view';

function ReportsPageInner() {
  const searchParams = useSearchParams();
  return <ReportsView period={searchParams.get('period')} />;
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">Loading…</div>}>
      <ReportsPageInner />
    </Suspense>
  );
}
