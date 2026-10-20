'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingScreen } from '@/components/shared/loading';

export default function ModuleEntry() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/app/dashboard');
  }, [router]);
  return <LoadingScreen label="Opening Canteen MIS…" />;
}
