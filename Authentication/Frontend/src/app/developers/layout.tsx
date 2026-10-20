'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { hasDeveloperSession } from '@/lib/developer-auth';
import { DeveloperShell } from '@/components/developer/developer-shell';

const PUBLIC_PATHS = ['/developers/login', '/developers/mfa', '/developers/activate'];

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!isPublic && !hasDeveloperSession()) {
      router.replace('/developers/login');
    }
  }, [isPublic, router, pathname]);

  if (isPublic) return <>{children}</>;
  return <DeveloperShell>{children}</DeveloperShell>;
}
