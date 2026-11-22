'use client';

import { MainLayout } from '@/layouts/main-layout';
import { RoundRollCallView } from '@/modules/attendance/round-roll-call-view';

export default function RoundRollCallPage() {
  return (
    <MainLayout>
      <RoundRollCallView />
    </MainLayout>
  );
}
