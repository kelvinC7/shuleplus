'use client';

import { MainLayout } from '@/layouts/main-layout';
import { SettingsView } from '@/modules/settings/settings-view';

export default function SettingsPage() {
  return (
    <MainLayout>
      <SettingsView />
    </MainLayout>
  );
}
