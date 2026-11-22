'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SessionLoadingScreen } from '@/components/session-access';

function HomeRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    router.replace(`/dashboard${qs ? `?${qs}` : ''}`);
  }, [router, searchParams]);

  return <SessionLoadingScreen label="Loading…" />;
}

export default function Home() {
  return (
    <Suspense fallback={<SessionLoadingScreen label="Loading…" />}>
      <HomeRedirect />
    </Suspense>
  );
}
