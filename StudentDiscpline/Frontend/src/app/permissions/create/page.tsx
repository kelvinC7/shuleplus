'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CreatePermissionRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/permissions');
  }, [router]);
  return null;
}
