'use client';

import { Suspense } from 'react';
import { CreateBudgetView } from '@/modules/create/create-budget-view';

export default function CreateBudgetPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <CreateBudgetView />
    </Suspense>
  );
}
