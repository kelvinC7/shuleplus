'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { TripDetailView } from '@/components/shuletrip/trip-detail-view';
import { useParentTrips } from '@/components/shuletrip/shuletrip-shell';

export default function ShuleTripDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tripId = String(params.tripId ?? '');
  const studentId = searchParams.get('studentId')?.trim() ?? '';
  const { data, loading, error, reload } = useParentTrips();
  const trip = data?.find(
    (t) => t.id === tripId && (!studentId || t.studentId === studentId)
  );

  if (loading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />;
  }

  if (error || !trip) {
    return (
      <div className="space-y-4">
        <PageHeader variant="card" eyebrow="ShuleTrip" title="Trip details" />
        <EmptyState
          icon={<AlertCircle className="text-red-500" />}
          title="Trip not found"
          description={error ?? 'This trip may have been removed or is not linked to your child.'}
        />
      </div>
    );
  }

  return <TripDetailView trip={trip} onReload={reload} />;
}
