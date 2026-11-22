'use client';

import type { ReactNode } from 'react';
import { TransportLocaleProvider } from '@/contexts/transport-locale-context';

export default function TransportLayout({ children }: { children: ReactNode }) {
  return <TransportLocaleProvider>{children}</TransportLocaleProvider>;
}
