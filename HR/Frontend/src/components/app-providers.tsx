'use client';

import { TokenBootstrapSuspense } from '@/components/token-bootstrap';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TokenBootstrapSuspense />
      {children}
    </>
  );
}
