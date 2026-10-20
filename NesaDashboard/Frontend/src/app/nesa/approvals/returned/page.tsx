'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ApprovalsReturnedRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/nesa/approvals?status=returned');
  }, [router]);
  return null;
}
