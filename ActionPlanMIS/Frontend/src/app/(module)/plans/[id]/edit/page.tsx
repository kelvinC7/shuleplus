'use client';

import { Suspense, use } from 'react';
import { PlanWizardView } from '@/modules/plans/plan-wizard-view';

function EditPlanPageInner({ id }: { id: string }) {
  return <PlanWizardView planId={id} />;
}

export default function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">Loading…</div>}>
      <EditPlanPageInner id={id} />
    </Suspense>
  );
}
