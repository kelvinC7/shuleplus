'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OrganizationAdminShell } from '@/components/organization-admin/organization-admin-shell';
import { getStoredUser, hasActiveSession, isOrganizationAdmin } from '@/lib/auth';

export default function OrganizationAdminLayout({ children }: { children: React.ReactNode }) {
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
    if (!isOrganizationAdmin(user)) {
      router.replace(user.dashboardRoute ?? '/post-login');
    }
  }, [router]);

  return <OrganizationAdminShell>{children}</OrganizationAdminShell>;
}
