'use client';

import { ReactNode } from 'react';
import { PayrollModuleDenied, PayrollModuleLoading } from '@/components/payroll-module-gate';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { MainLayout } from '@/layouts/main-layout';

function Gate({ children }: { children: ReactNode }) {
  const { ready, authorized, error, reload, reloading } = useAuth();

  if (!ready) return <PayrollModuleLoading />;

  if (!authorized) {
    return (
      <PayrollModuleDenied
        error={error}
        onRetry={() => void reload()}
        retrying={reloading}
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
