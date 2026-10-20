'use client';

import { Suspense } from 'react';
import { CreateWizardView } from '@/modules/create/create-wizard-view';

export default function CreateCircularPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">Loading editor…</div>
      }
    >
      <CreateWizardView />
    </Suspense>
  );
}
