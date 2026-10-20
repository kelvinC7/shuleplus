'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserWorkspaceShell } from '@/components/user-workspace/user-workspace-shell';
import {
  getStoredUser,
  hasActiveSession,
  isOrganizationAdmin,
  isPlatformAdmin,
  resolvePostLoginRoute,
} from '@/lib/auth';

export default function PostLoginLayout({ children }: { children: React.ReactNode }) {
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
    if (isPlatformAdmin(user) || isOrganizationAdmin(user)) {
      router.replace(resolvePostLoginRoute(user));
    }
  }, [router]);

  return <UserWorkspaceShell>{children}</UserWorkspaceShell>;
}
