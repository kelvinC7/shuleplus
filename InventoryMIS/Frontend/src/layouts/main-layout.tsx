'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { PlatformAppShell } from '@/layouts/platform-app-shell';
import { SessionAccessDeniedScreen } from '@/components/session-access';

function AccessGate({ children }: { children: ReactNode }) {
  const { ready, authorized, error } = useAuth();
  const loginUrl = process.env.NEXT_PUBLIC_IAM_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

  if (!ready) {
    return (
      <div className="dashboard-bg flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Verifying license and tenant…
      </div>
    );
  }

  if (!authorized) {
    const message = error ?? 'Module Not Licensed';

    return (
      <SessionAccessDeniedScreen
        error={message}
        moduleName="Inventory MIS"
        primaryLabel="Back to Organization Dashboard"
        primaryHref={`${loginUrl}/organization-admin`}
      />
    );
  }

  return <PlatformAppShell>{children}</PlatformAppShell>;
}

export function MainLayout({ children }: { children: ReactNode }) {
  return <AccessGate>{children}</AccessGate>;
}
