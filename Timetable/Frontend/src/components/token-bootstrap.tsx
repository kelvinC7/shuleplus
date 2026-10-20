'use client';

import { Suspense } from 'react';
import { captureTokenFromUrl } from '@/shared/auth-token';

function TokenBootstrap() {
  if (typeof window !== 'undefined') captureTokenFromUrl();
  return null;
}

export function TokenBootstrapSuspense() {
  return (
    <Suspense fallback={null}>
      <TokenBootstrap />
    </Suspense>
  );
}
