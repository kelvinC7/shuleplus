'use client';

import { Suspense } from 'react';
import { RegisterView } from '@/modules/register/register-view';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted">Loading register…</div>}>
      <RegisterView />
    </Suspense>
  );
}