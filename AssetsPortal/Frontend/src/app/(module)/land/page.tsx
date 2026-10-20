'use client';

import { Suspense } from 'react';
import { LandRegisterView } from '@/modules/land/land-register-view';

export default function LandPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted">Loading land register…</div>}>
      <LandRegisterView />
    </Suspense>
  );
}
