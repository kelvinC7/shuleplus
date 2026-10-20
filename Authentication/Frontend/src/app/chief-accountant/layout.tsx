'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChiefAccountantShell } from '@/components/chief-accountant/chief-accountant-shell';
import { getStoredUser, hasActiveSession, isChiefAccountant } from '@/lib/auth';

export default function ChiefAccountantLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!hasActiveSession()) {
      router.replace('/login');
      return;
    }
    const user = getStoredUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!isChiefAccountant(user)) {
      router.replace(user.dashboardRoute ?? '/post-login');
    }
  }, [router]);

  return <ChiefAccountantShell>{children}</ChiefAccountantShell>;
}
