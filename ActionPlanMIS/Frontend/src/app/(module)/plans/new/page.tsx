'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PlanWizardView } from '@/modules/plans/plan-wizard-view';

function NewPlanPageInner() {
  const searchParams = useSearchParams();
  const templateId = searchParams.get('templateId') ?? undefined;
  return <PlanWizardView templateId={templateId} />;
}

export default function NewPlanPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">Loading…</div>}>
      <NewPlanPageInner />
    </Suspense>
  );
}
