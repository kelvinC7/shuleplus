'use client';

import { Suspense } from 'react';
import { AttendanceView } from '@/modules/teaching/attendance-view';

export default function AttendancePage() {
  return (
    <Suspense
      fallback={<div className="py-12 text-center text-sm text-muted">Loading attendance…</div>}
    >
      <AttendanceView />
    </Suspense>
  );
}
