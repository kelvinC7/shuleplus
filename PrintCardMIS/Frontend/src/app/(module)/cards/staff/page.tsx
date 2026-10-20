import { Suspense } from 'react';
import { ProductionView } from '@/modules/production/production-view';

function Fallback() {
  return <div className="py-20 text-center text-sm text-muted">Loading staff…</div>;
}

export default function StaffPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <ProductionView kind="STAFF" />
    </Suspense>
  );
}
