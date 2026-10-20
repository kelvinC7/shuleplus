'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CalendarView } from '@/modules/calendar/calendar-view';

function CalendarPageInner() {
  const searchParams = useSearchParams();
  const planId = searchParams.get('planId') ?? undefined;
  return <CalendarView initialPlanId={planId} />;
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">Loading…</div>}>
      <CalendarPageInner />
    </Suspense>
  );
}
