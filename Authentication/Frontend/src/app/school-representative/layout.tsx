'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RepresentativeShell } from '@/components/school-representative/representative-shell';
import { getStoredUser, hasActiveSession, isSchoolRepresentative } from '@/lib/auth';

export default function SchoolRepresentativeLayout({ children }: { children: React.ReactNode }) {
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
    if (!isSchoolRepresentative(user)) {
      router.replace(user.dashboardRoute ?? '/post-login');
    }
  }, [router]);

  return <RepresentativeShell>{children}</RepresentativeShell>;
}
