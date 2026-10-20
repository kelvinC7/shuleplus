'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { NesaAppShell } from '@/layouts/nesa-app-shell';

function Gate({ children }: { children: ReactNode }) {
  const { ready, authorized, error } = useAuth();
  const loginUrl = process.env.NEXT_PUBLIC_IAM_LOGIN_URL
    ?? (process.env.NEXT_PUBLIC_IAM_URL
      ? `${process.env.NEXT_PUBLIC_IAM_URL.replace(/\/$/, '')}/login`
      : 'http://localhost:3000/login');

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8FC] text-sm text-[#000435]/60">
        Verifying NESA access…
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8FC] p-4">
        <div className="max-w-md rounded-2xl border border-[#000435]/10 bg-white p-8 text-center">
          <h1 className="font-semibold text-xl text-[#000435]">Access Denied</h1>
          <p className="mt-3 text-sm text-[#000435]/70">{error ?? 'You are not assigned to NESA.'}</p>
          <a
            href={loginUrl}
            className="mt-6 inline-block rounded-xl bg-[#000435] px-5 py-2.5 text-sm font-semibold text-[#FCB038]"
          >
            Back to login
          </a>
        </div>
      </div>
    );
  }

  return <NesaAppShell>{children}</NesaAppShell>;
}

export default function NesaLayout({ children }: { children: ReactNode }) {
  return <Gate>{children}</Gate>;
}
