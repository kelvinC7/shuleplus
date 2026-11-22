'use client';

import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ShuleTripSubnav } from '@/components/shuletrip/shuletrip-subnav';
import { useFetch, useStudentFetch } from '@/hooks/use-fetch';
import type { SchoolTrip } from '@/types/shuletrip';

/** All trips for this guardian phone (every linked learner). */
export function useParentTrips() {
  return useFetch<SchoolTrip[]>('/trips');
}

/** Trips for the active child only (child switcher). */
export function useShuleTrips() {
  return useStudentFetch<SchoolTrip[]>('/trips');
}

export function ShuleTripShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: (ctx: { trips: SchoolTrip[]; reload: () => void }) => ReactNode;
}) {
  const { data, loading, error, reload } = useParentTrips();

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        variant="card"
        eyebrow="ShuleTrip"
        title={title}
        description={description ?? 'Trips synced from your school’s ShuleTrip manifest for your login phone.'}
      />
      <ShuleTripSubnav />
      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
      ) : error ? (
        <EmptyState icon={<AlertCircle className="text-red-500" />} title="Could not load trips" description={error} />
      ) : !data?.length ? (
        <EmptyState
          title="No trips yet"
          description="Trips appear after the school submits the application in ShuleTrip. Check that your login phone matches the guardian number on the trip manifest, then ask the school to submit or resubmit the trip. When a trip is ready, open Consents to approve or decline."
        />
      ) : (
        children({ trips: data, reload })
      )}
    </div>
  );
}
