'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { AcademicSettingsProvider } from '@/contexts/academic-settings-context';
import { GateProvider } from '@/modules/gateManager/gate-context';
import { DisciplineAppShell } from '@/layouts/discipline-app-shell';

function AccessGate({ children }: { children: ReactNode }) {
  const { ready, authorized, error } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Verifying license and tenant…
      </div>
    );
  }

  if (!authorized) {
    const loginUrl = process.env.NEXT_PUBLIC_IAM_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
    const orgUrl = `${loginUrl}/organization-admin`;
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-[#000435]">Access Denied</h1>
          <p className="mt-3 text-sm text-slate-500">{error ?? 'Module not licensed'}</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <a
              href="/login"
              className="inline-block rounded-xl bg-[#fcb038] px-5 py-2.5 text-sm font-semibold text-[#000435]"
            >
              Gate Officer Sign In
            </a>
            <a
              href={orgUrl}
              className="inline-block rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-[#000435]"
            >
              Organization Dashboard
            </a>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Gate officers: sign in with your email and temporary password. Admins: launch from the organization dashboard.
          </p>
        </div>
      </div>
    );
  }

  return <DisciplineAppShell>{children}</DisciplineAppShell>;
}

export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <AccessGate>
      <AcademicSettingsProvider>
        <GateProvider>{children}</GateProvider>
      </AcademicSettingsProvider>
    </AccessGate>
  );
}
