'use client';

import { Suspense, useEffect } from 'react';
import { captureTokenFromUrl } from '@/shared/auth-token';

export function TokenBootstrap() {
  useEffect(() => {
    captureTokenFromUrl();
  }, []);
  return null;
}

export function TokenBootstrapSuspense() {
  return (
    <Suspense fallback={null}>
      <TokenBootstrap />
    </Suspense>
  );
}
