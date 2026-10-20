'use client';

import { usePathname } from 'next/navigation';
import { detectPlatformScope, getPlatformConfig, type PlatformAdminConfig } from '@/lib/platform-admin';

export function usePlatformAdmin(): PlatformAdminConfig {
  const pathname = usePathname();
  return getPlatformConfig(detectPlatformScope(pathname));
}
