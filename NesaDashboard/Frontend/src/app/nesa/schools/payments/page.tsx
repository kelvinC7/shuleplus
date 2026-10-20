'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SchoolPaymentsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/nesa/schools/analytics');
  }, [router]);
  return null;
}
