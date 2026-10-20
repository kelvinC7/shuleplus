'use client';

import { AuthProvider } from '@/contexts/auth-context';

export function NesaProviders({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
