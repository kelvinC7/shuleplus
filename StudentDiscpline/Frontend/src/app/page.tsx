'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

function HomeRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, authorized, isGateOnlyUser } = useAuth();

  useEffect(() => {
    if (!ready) return;
    const qs = searchParams.toString();
    const dest = authorized && isGateOnlyUser ? '/gate' : '/dashboard';
    router.replace(`${dest}${qs ? `?${qs}` : ''}`);
  }, [router, searchParams, ready, authorized, isGateOnlyUser]);

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted">
      Redirecting…
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted">
          Loading…
        </div>
      }
    >
      <HomeRedirect />
    </Suspense>
  );
}
