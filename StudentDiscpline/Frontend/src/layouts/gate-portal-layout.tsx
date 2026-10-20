'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { AcademicSettingsProvider } from '@/contexts/academic-settings-context';
import { GateProvider } from '@/modules/gateManager/gate-context';
import { GateOfficerShell } from '@/modules/gateOfficer/gate-officer-shell';
import { MainLayout } from '@/layouts/main-layout';

/** Gate portal layout — gate officers get a dedicated shell; admins keep full layout. */
export function GatePortalLayout({ children }: { children: ReactNode }) {
  const { ready, authorized, isGateOnlyUser } = useAuth();

  if (!ready || !authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        {!ready ? 'Loading gate portal…' : 'Verifying access…'}
      </div>
    );
  }

  if (isGateOnlyUser) {
    return (
      <AcademicSettingsProvider>
        <GateProvider>
          <GateOfficerShell>{children}</GateOfficerShell>
        </GateProvider>
      </AcademicSettingsProvider>
    );
  }

  return <MainLayout>{children}</MainLayout>;
}
