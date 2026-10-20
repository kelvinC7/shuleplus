'use client';

import dynamic from 'next/dynamic';

const CreateTimetableView = dynamic(
  () => import('@/modules/create-timetable/create-timetable-view').then((mod) => mod.CreateTimetableView),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">
        Loading create timetable…
      </div>
    ),
  },
);

export default function CreateTimetablePage() {
  return <CreateTimetableView />;
}
