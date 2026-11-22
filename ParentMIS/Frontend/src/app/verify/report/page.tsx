'use client';

import { Suspense } from 'react';
import { ReportVerifyPageContent } from './report-verify-content';

function VerifyFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
    </div>
  );
}

export default function ReportVerifyPage() {
  return (
    <Suspense fallback={<VerifyFallback />}>
      <ReportVerifyPageContent />
    </Suspense>
  );
}
