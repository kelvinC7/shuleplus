'use client';

import { GatePortalLayout } from '@/layouts/gate-portal-layout';

export default function GatePortalRootLayout({ children }: { children: React.ReactNode }) {
  return <GatePortalLayout>{children}</GatePortalLayout>;
}
