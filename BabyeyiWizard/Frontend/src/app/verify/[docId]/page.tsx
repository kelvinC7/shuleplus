'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { VerifyPublicView } from '@/modules/verify/verify-view';

function VerifyContent() {
  const params = useSearchParams();
  const hash = params.get('h') ?? undefined;
  return <VerifyPublicView hash={hash} />;
}

export default function PublicVerifyPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-muted">Loading…</div>}>
      <VerifyContent />
    </Suspense>
  );
}
