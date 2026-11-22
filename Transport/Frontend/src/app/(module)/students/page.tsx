'use client';

import dynamic from 'next/dynamic';

const TransportLearnersView = dynamic(
  () => import('@/modules/learners/transport-learners-view').then((m) => ({ default: m.TransportLearnersView })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[320px] items-center justify-center text-sm text-muted">Loading transport learners…</div>
    ),
  }
);

export default function Page() {
  return <TransportLearnersView />;
}
