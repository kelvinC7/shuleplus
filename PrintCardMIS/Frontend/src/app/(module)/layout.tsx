'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { PrintCardHeader } from '@/components/print-card-header';
import { redirectToLogin } from '@/utils/auth-login';

function Gate({ children }: { children: ReactNode }) {
  const { ready, authorized, error } = useAuth();
  const redirecting = useRef(false);

  const isAuthError = Boolean(
    error &&
      /token|authentication|session|expired|sign in|log in|unauthorized|access denied/i.test(error)
  );

  useEffect(() => {
    if (!ready || authorized || redirecting.current || !isAuthError) return;
    redirecting.current = true;
    void redirectToLogin('Your session has expired. Please log in again.');
  }, [ready, authorized, error, isAuthError]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Verifying access…
      </div>
    );
  }

  if (!authorized) {
    const iamUrl = process.env.NEXT_PUBLIC_IAM_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-navy">{isAuthError ? 'Redirecting to login…' : 'Access Denied'}</h1>
          <p className="mt-3 text-sm text-muted">{error ?? 'Module Not Licensed'}</p>
          {!isAuthError && (
            <a
              href={`${iamUrl}/post-login`}
              className="mt-6 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-navy"
            >
              Back to dashboard
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PrintCardHeader />
      <main className="mx-auto max-w-[1500px] px-3 py-4 sm:px-6 sm:py-6">{children}</main>
    </div>
  );
}

export default function ModuleLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Gate>{children}</Gate>
    </AuthProvider>
  );
}
