'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ApprovalsApprovedRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/nesa/approvals?status=approved');
  }, [router]);
  return null;
}
