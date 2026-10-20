'use client';

import { Suspense } from 'react';
import { ScanView } from '@/modules/scan/scan-view';

export default function ScanPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted">Loading scan…</p>}>
      <ScanView />
    </Suspense>
  );
}
