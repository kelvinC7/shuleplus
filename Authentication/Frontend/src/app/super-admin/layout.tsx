'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, hasActiveSession, isSuperAdmin } from '@/lib/auth';
import { SuperAdminShell } from '@/components/super-admin/super-admin-shell';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
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
    if (!isSuperAdmin(user)) {
      router.replace(user.dashboardRoute ?? '/post-login');
    }
  }, [router]);

  return <SuperAdminShell>{children}</SuperAdminShell>;
}
