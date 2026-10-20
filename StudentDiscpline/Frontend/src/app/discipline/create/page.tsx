'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateDisciplineRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/discipline');
  }, [router]);
  return null;
}
