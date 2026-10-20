'use client';

import { ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
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
    const loginUrl = process.env.NEXT_PUBLIC_IAM_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-navy">Access Denied</h1>
          <p className="mt-3 text-sm text-muted">{error ?? 'Module Not Licensed'}</p>
          <a href={`${loginUrl}/organization-admin`} className="mt-6 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-navy">
            Back to Organization Dashboard
          </a>
        </div>
      </div>
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
