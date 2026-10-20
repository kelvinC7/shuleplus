import { Suspense } from 'react';
import { CaStudentFeeAccountsView } from '@/components/chief-accountant/ca-student-fee-accounts-view';

export default function Page() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted">Loading student accounts…</p>}>
      <CaStudentFeeAccountsView />
    </Suspense>
  );
}
