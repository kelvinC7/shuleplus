'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function HomeRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    const suffix = qs ? `?${qs}` : '';
    router.replace(`/dashboard${suffix}`);
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
