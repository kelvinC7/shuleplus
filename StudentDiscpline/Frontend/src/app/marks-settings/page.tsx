'use client';

import { MainLayout } from '@/layouts/main-layout';
import { SettingsView } from '@/modules/settings/settings-view';

export default function MarksSettingsPage() {
  return (
    <MainLayout>
      <SettingsView
        title="Marks Settings"
        subtitle="Manage discipline mark rules, point values and how marks are applied to students"
      />
    </MainLayout>
  );
}
