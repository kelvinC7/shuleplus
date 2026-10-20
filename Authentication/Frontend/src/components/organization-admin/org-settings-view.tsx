'use client';

import { useState } from 'react';
import { AcademicSettingsView } from '@/components/organization-admin/academic-settings-view';
import { OrgProfileEditWizard } from '@/components/organization-admin/org-profile-edit-wizard';

const TABS = [
  { id: 'profile', label: 'School profile' },
  { id: 'academic', label: 'Academic settings' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function OrgSettingsView() {
  const [tab, setTab] = useState<TabId>('profile');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Manage your school profile, branding, and academic calendar for all modules.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-white p-1.5 shadow-sm">
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                active ? 'bg-navy text-white shadow-sm' : 'text-navy/70 hover:bg-navy/5 hover:text-navy'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === 'profile' ? <OrgProfileEditWizard /> : <AcademicSettingsView embedded />}
    </div>
  );
}
