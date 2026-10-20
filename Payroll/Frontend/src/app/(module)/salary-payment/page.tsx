'use client';
import { Suspense } from 'react';
import { SalaryPaymentView } from '@/modules/salary-payment/salary-payment-view';
export default function Page() {
  return <Suspense fallback={<div className="p-8 text-sm text-muted">Loading…</div>}><SalaryPaymentView /></Suspense>;
}
