'use client';

import dynamic from 'next/dynamic';

const TimetableView = dynamic(
  () => import('@/modules/timetable/timetable-view').then((mod) => mod.TimetableView),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">
        Loading timetable…
      </div>
    ),
  },
);

export default function TimetablePage() {
  return <TimetableView />;
}
