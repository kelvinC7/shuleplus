'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TasksView } from '@/modules/tasks/tasks-view';

function TasksPageInner() {
  const searchParams = useSearchParams();
  return <TasksView mode={searchParams.get('view')} />;
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">Loading…</div>}>
      <TasksPageInner />
    </Suspense>
  );
}
