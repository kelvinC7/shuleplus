'use client';

import { type ReactNode } from 'react';
import { SessionAccessDeniedScreen } from '@/components/session-access/session-access-denied-screen';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { MainLayout } from '@/layouts/main-layout';
import { buildIamLoginUrl, isSessionAuthError } from '@/utils/iam-login-redirect';

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
    if (isSessionAuthError(error)) {
      return (
        <div className="flex min-h-[100dvh] items-center justify-center px-4 text-sm text-muted">
          Redirecting to sign in…
        </div>
      );
    }

    const loginUrl = process.env.NEXT_PUBLIC_IAM_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
    return (
      <SessionAccessDeniedScreen
        error={error}
        moduleName="Smart Transport"
        iamUrl={loginUrl}
        primaryHref={buildIamLoginUrl()}
        primaryLabel="Sign in"
        showTryAgain
        idPrefix="transport"
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
