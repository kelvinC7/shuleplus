'use client';

import { Suspense } from 'react';
import CircularsListInner from './circulars-list-inner';

export default function CircularsListPage() {
  return (
    <Suspense fallback={<p className="text-sm text-navy/45">Loading circulars…</p>}>
      <CircularsListInner />
    </Suspense>
  );
}
