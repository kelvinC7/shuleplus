'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function HomeRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    router.replace(`/dashboard${qs ? `?${qs}` : ''}`);
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted">
      Redirecting to dashboard…
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
