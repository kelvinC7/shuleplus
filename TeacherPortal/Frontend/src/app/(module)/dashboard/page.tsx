'use client';

import { useAuth } from '@/contexts/auth-context';
import { DashboardView } from '@/modules/dashboard/dashboard-view';

export default function DashboardPage() {
  const { summary } = useAuth();

  if (!summary) {
    return (
      <div className="py-12 text-center text-sm text-muted">Loading dashboard…</div>
    );
  }

  return <DashboardView summary={summary} />;
}
