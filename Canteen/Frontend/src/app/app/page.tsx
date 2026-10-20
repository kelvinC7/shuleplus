'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingScreen } from '@/components/shared/loading';

export default function AppIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/app/dashboard');
  }, [router]);
  return <LoadingScreen label="Loading…" />;
}
