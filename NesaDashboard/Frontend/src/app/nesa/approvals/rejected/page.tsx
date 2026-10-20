'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ApprovalsRejectedRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/nesa/approvals?status=rejected');
  }, [router]);
  return null;
}
