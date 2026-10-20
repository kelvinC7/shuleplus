'use client';

import { ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { AcademicSettingsProvider } from '@/contexts/academic-settings-context';
import { SessionAccessDeniedScreen } from '@/components/session-access';
import { MainLayout } from '@/layouts/main-layout';

function Gate({ children }: { children: ReactNode }) {
  const { ready, authorized, error } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Verifying license and tenant…
      </div>
    );
  }

  if (!authorized) {
    return (
      <SessionAccessDeniedScreen
        error={error}
        moduleName="Timetable"
        iamUrl={process.env.NEXT_PUBLIC_IAM_URL}
      />
    );
  }

  return <MainLayout>{children}</MainLayout>;
}

export default function ModuleLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AcademicSettingsProvider>
        <Gate>{children}</Gate>
      </AcademicSettingsProvider>
    </AuthProvider>
  );
}
