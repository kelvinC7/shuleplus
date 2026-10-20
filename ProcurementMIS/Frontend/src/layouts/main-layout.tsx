'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { SessionAccessDeniedScreen } from '@/components/session-access';
import { ProcurementAppShell } from '@/layouts/procurement-app-shell';

function Gate({ children }: { children: ReactNode }) {
  const { ready, authorized, error } = useAuth();

  if (!ready) {
    return (
      <div className="dashboard-bg flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted">Verifying access…</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <SessionAccessDeniedScreen
        error={error}
        moduleName="Procurement MIS"
      />
    );
  }

  return <ProcurementAppShell>{children}</ProcurementAppShell>;
}

export function MainLayout({ children }: { children: ReactNode }) {
  return <Gate>{children}</Gate>;
}
