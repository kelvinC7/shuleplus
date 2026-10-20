import { Suspense } from 'react';
import { ProductionView } from '@/modules/production/production-view';

function Fallback() {
  return <div className="py-20 text-center text-sm text-muted">Loading students…</div>;
}

export default function StudentsPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <ProductionView kind="STUDENT" />
    </Suspense>
  );
}
