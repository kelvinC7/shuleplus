'use client';

import { Bus, MapPin, Phone, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { useStudentFetch } from '@/hooks/use-fetch';

interface TransportProfile {
  logistics?: {
    transport?: {
      subscriptionStatus: string;
      transportMode: string;
      routeDetails: string;
      busNumber: string;
      driverName: string;
      driverPhone: string;
      pickupTime: string;
    };
  };
}

export default function BusPage() {
  const { data, loading, error } = useStudentFetch<TransportProfile>('/profile');
  const bus = data?.logistics?.transport;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Transport"
        title="Live bus & boarding"
      />
      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
      ) : error ? (
        <EmptyState icon={<AlertCircle className="text-red-500" />} title="Unable to load transport" description={error} />
      ) : !bus || bus.subscriptionStatus === 'No Subscription' ? (
        <EmptyState title="No school bus assigned" description="When the school assigns a route, boarding alerts will appear here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="hr-card space-y-3 p-5">
            <div className="flex items-center gap-2 font-semibold text-navy">
              <Bus className="size-4" /> {bus.busNumber || 'School bus'}
            </div>
            <p className="text-sm text-muted">{bus.subscriptionStatus}</p>
            <p className="text-sm"><MapPin className="mr-1 inline size-3.5" />{bus.routeDetails || '—'}</p>
            <p className="text-sm">Pickup: {bus.pickupTime || '—'}</p>
            <p className="text-sm">Mode: {bus.transportMode || '—'}</p>
          </div>
          <div className="hr-card space-y-3 p-5">
            <p className="font-semibold text-navy">Driver</p>
            <p className="text-sm">{bus.driverName || '—'}</p>
            {bus.driverPhone ? (
              <a href={`tel:${bus.driverPhone}`} className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700">
                <Phone className="size-3.5" /> {bus.driverPhone}
              </a>
            ) : (
              <p className="text-sm text-muted">No driver phone on file</p>
            )}
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Live GPS map appears here when the bus is on a trip. Boarding alerts are sent as SMS when RFID is tapped.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
