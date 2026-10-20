'use client';

import { ReactNode, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { AcademicSettingsProvider } from '@/contexts/academic-settings-context';
import { MainLayout } from '@/layouts/main-layout';
import { getToken } from '@/shared/auth-token';

function Gate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { ready, authorized, error } = useAuth();
  const token = getToken();

  useEffect(() => {
    if (ready && !token) {
      router.replace('/login');
    }
  }, [ready, token, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-navy px-4">
        <Image
          src="/logo_white.png"
          alt="Shule Teacher"
          width={180}
          height={50}
          priority
          className="h-auto w-[min(180px,70vw)] object-contain"
        />
        <p className="text-sm text-white/70">Verifying license and tenant…</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Redirecting to sign in…
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
          <Image
            src="/logo.png"
            alt="Shule Teacher"
            width={160}
            height={44}
            className="mx-auto h-auto w-[min(160px,60vw)] object-contain"
          />
          <h1 className="mt-5 text-xl font-bold text-navy">Access Denied</h1>
          <p className="mt-3 text-sm text-muted">{error ?? 'Module Not Licensed'}</p>
          <p className="mt-2 text-xs text-muted">
            Your school must have Teacher Portal licensed and provisioned. Contact your organization admin.
          </p>
          <a href="/login" className="btn-primary mt-6 inline-block">
            Back to Teacher Sign In
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function ModuleLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Gate>
        <AcademicSettingsProvider>
          <MainLayout>{children}</MainLayout>
        </AcademicSettingsProvider>
      </Gate>
    </AuthProvider>
  );
}
