'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { isGateOfficerOnlyPath } from '@/config/discipline-nav';

const GATE_HOME_PATHS = ['/', '/dashboard'];

/** Sends gate officers to /gate and blocks non-gate routes. */
export function GateOnlyRedirect() {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, authorized, isGateOnlyUser } = useAuth();

  useEffect(() => {
    if (!ready || !authorized || !isGateOnlyUser) return;

    if (GATE_HOME_PATHS.includes(pathname)) {
      router.replace('/gate');
      return;
    }

    if (!isGateOfficerOnlyPath(pathname)) {
      router.replace('/gate');
    }
  }, [ready, authorized, isGateOnlyUser, pathname, router]);

  return null;
}
