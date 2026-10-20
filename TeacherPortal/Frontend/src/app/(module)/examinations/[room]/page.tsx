'use client';

import { use } from 'react';
import { ExaminationRoomView } from '@/modules/examinations/examination-room-view';

export default function ExaminationRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ room: string }>;
  searchParams: Promise<{ sessionId?: string; examDate?: string; slotCode?: string }>;
}) {
  const { room } = use(params);
  const query = use(searchParams);
  return (
    <ExaminationRoomView
      roomName={decodeURIComponent(room)}
      sessionId={query.sessionId}
      examDate={query.examDate}
      slotCode={query.slotCode}
    />
  );
}
