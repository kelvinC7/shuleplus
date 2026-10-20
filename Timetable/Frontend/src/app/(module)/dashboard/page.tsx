'use client';

import dynamic from 'next/dynamic';
import { DashboardSkeleton } from '@/modules/dashboard/dashboard-skeleton';

const DashboardView = dynamic(
  () => import('@/modules/dashboard/dashboard-view').then((mod) => mod.DashboardView),
  {
    ssr: false,
    loading: () => <DashboardSkeleton />,
  },
);

export default function DashboardPage() {
  return <DashboardView />;
}
