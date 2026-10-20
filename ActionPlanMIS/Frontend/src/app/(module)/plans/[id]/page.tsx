'use client';

import { Suspense, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { PlanDetailView } from '@/modules/plans/plan-detail-view';

function PlanDetailPageInner({ planId }: { planId: string }) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') ?? undefined;
  return <PlanDetailView planId={planId} initialTab={initialTab} />;
}

export default function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">Loading…</div>}>
      <PlanDetailPageInner planId={id} />
    </Suspense>
  );
}
