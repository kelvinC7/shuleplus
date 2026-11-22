'use client';

import dynamic from 'next/dynamic';

const RoutesWorkspaceView = dynamic(
  () => import('@/modules/routes/routes-workspace-view').then((m) => ({ default: m.RoutesWorkspaceView })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-navy">Loading routes & map…</p>
        <p className="text-xs text-muted">First load can take a moment while the map bundle compiles.</p>
      </div>
    ),
  }
);

export default function Page() {
  return <RoutesWorkspaceView />;
}
