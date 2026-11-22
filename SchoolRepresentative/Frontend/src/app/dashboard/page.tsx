'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SessionLoadingScreen } from '@/components/session-access';
import { storeTokens } from '@/shared/auth-token';

function DashboardEntry() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refresh_token') ?? searchParams.get('refreshToken');
    if (token) storeTokens(token, refreshToken);
    // The console gate decides: valid session → overview, missing/expired → session screen.
    router.replace('/director/overview');
  }, [router, searchParams]);

  return <SessionLoadingScreen label="Opening Director Console…" />;
}

export default function DashboardEntryPage() {
  return (
    <Suspense fallback={<SessionLoadingScreen label="Opening Director Console…" />}>
      <DashboardEntry />
    </Suspense>
  );
}
