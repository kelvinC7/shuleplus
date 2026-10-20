'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getToken } from '@/shared/auth-token';

function HomeRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = getToken();
    const qs = searchParams.toString();
    if (!token) {
      router.replace(`/login${qs ? `?${qs}` : ''}`);
      return;
    }
    router.replace(`/dashboard${qs ? `?${qs}` : ''}`);
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted">
      Loading…
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
