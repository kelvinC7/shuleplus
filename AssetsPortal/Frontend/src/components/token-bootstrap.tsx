'use client';

import { Suspense } from 'react';
import { captureTokenFromUrl } from '@/shared/auth-token';

function TokenBootstrapInner() {
  if (typeof window !== 'undefined') captureTokenFromUrl();
  return null;
}

export function TokenBootstrapSuspense() {
  return (
    <Suspense fallback={null}>
      <TokenBootstrapInner />
    </Suspense>
  );
}
