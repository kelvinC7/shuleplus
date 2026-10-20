'use client';

import { Suspense } from 'react';
import { RfidSchoolsView } from '@/components/super-admin/rfid-network/schools-view';

export default function RfidSchoolsPage() {
  return (
    <Suspense fallback={<div className="py-12 text-sm text-muted">Loading schools…</div>}>
      <RfidSchoolsView />
    </Suspense>
  );
}
