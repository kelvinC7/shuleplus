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
      Opening Digital Attendance…
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted">
          Opening Digital Attendance…
        </div>
      }
    >
      <HomeRedirect />
    </Suspense>
  );
}
