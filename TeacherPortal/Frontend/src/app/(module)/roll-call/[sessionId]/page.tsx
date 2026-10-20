'use client';

import { use } from 'react';
import { RollCallSessionView } from '@/modules/roll-call/roll-call-session-view';

export default function RollCallSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  return <RollCallSessionView sessionId={sessionId} />;
}
