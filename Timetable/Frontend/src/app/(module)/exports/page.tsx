'use client';

import dynamic from 'next/dynamic';

const ExportsView = dynamic(
  () => import('@/modules/exports/exports-view').then((mod) => mod.ExportsView),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">
        Loading exports…
      </div>
    ),
  },
);

export default function ExportsPage() {
  return <ExportsView />;
}
