import { Suspense } from 'react';
import { HistoryView } from '@/modules/production/history-view';

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted">Loading history…</div>}>
      <HistoryView />
    </Suspense>
  );
}
