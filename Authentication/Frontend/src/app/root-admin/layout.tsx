'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, hasActiveSession, isRootAdmin } from '@/lib/auth';
import { RootAdminShell } from '@/components/root-admin/root-admin-shell';

export default function RootAdminLayout({ children }: { children: React.ReactNode }) {
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
    if (!isRootAdmin(user)) {
      router.replace(user.dashboardRoute ?? '/post-login');
    }
  }, [router]);

  return <RootAdminShell>{children}</RootAdminShell>;
}
