'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { GateCheckinView } from '@/modules/gateManager/gate-scan-views';

function GateCheckinContent() {
  const params = useSearchParams();
  const code = params.get('code') ?? undefined;
  return <GateCheckinView initialCode={code} />;
}

export default function GateCheckinPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading check-in…</div>}>
      <GateCheckinContent />
    </Suspense>
  );
}
