'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { captureTokenFromUrl } from '@/shared/auth-token';

function DashboardRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    captureTokenFromUrl();
    const token = searchParams.get('token');
    const refresh = searchParams.get('refresh');
    const qs = new URLSearchParams();
    if (token) qs.set('token', token);
    if (refresh) qs.set('refresh', refresh);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    router.replace(`/cards/dashboard${suffix}`);
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted">
      Opening Print Card…
    </div>
  );
}

/** Hand off IAM login tokens and land on Print Card production. */
export default function DashboardRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted">
          Opening Print Card…
        </div>
      }
    >
      <DashboardRedirectInner />
    </Suspense>
  );
}
