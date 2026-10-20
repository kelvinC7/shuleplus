'use client';

import dynamic from 'next/dynamic';

const ExtraActivitiesView = dynamic(
  () =>
    import('@/modules/extra-activities/extra-activities-view').then(
      (mod) => mod.ExtraActivitiesView
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">
        Loading extra activities…
      </div>
    ),
  }
);

export default function ExtraActivitiesPage() {
  return <ExtraActivitiesView />;
}
