'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ApprovalsPendingRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/nesa/approvals?status=pending');
  }, [router]);
  return null;
}
