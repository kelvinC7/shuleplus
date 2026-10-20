'use client';

import { MainLayout } from '@/layouts/main-layout';
import { BehaviorAwardsView } from '@/modules/behavior/behavior-awards-view';

export default function BehaviorPage() {
  return (
    <MainLayout>
      <BehaviorAwardsView />
    </MainLayout>
  );
}
