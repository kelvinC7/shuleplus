'use client';

import { ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { SessionAccessDeniedScreen } from '@/components/session-access';
import { MainLayout } from '@/layouts/main-layout';

function Gate({ children }: { children: ReactNode }) {
  const { ready, authorized, error } = useAuth();
  const loginUrl = process.env.NEXT_PUBLIC_IAM_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

  if (!ready) {
    return (
      <div
        className="flex min-h-[100dvh] items-center justify-center text-sm text-muted"
        style={{
          backgroundColor: '#f4f6fb',
          backgroundImage:
            'radial-gradient(circle at 12% 8%, rgba(252,176,56,0.08), transparent 38%), radial-gradient(circle at 88% 92%, rgba(0,4,53,0.06), transparent 42%)',
        }}
      >
        Verifying license and tenant…
      </div>
    );
  }

  if (!authorized) {
    return (
      <SessionAccessDeniedScreen
        error={error ?? 'Module Not Licensed'}
        moduleName="School Budget"
        primaryLabel="Back to Organization Dashboard"
        primaryHref={`${loginUrl}/organization-admin`}
        idPrefix="budget-sess"
      />
    );
  }

  return <MainLayout>{children}</MainLayout>;
}

export default function ModuleLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Gate>{children}</Gate>
    </AuthProvider>
  );
}
