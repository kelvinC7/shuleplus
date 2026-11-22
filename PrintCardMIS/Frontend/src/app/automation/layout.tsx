'use client';

import { ReactNode, useEffect } from 'react';
import { captureTokenFromUrl } from '@/shared/auth-token';

/** Automation routes use ?token= from URL; no Print Card module session gate. */
export default function AutomationLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    captureTokenFromUrl();
  }, []);

  return <>{children}</>;
}
