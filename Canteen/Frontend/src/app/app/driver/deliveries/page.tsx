'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Truck, Navigation, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useApi } from '@/lib/use-api';
import { api } from '@/services/api';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge, Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/shared/loading';
import { formatDateTime } from '@/lib/format';
import type { Delivery } from '@/types';

export default function DriverDeliveriesPage() {
  const { profile } = useAuth();
  const driverId = profile?.driverId ?? '';
  const { data, loading, error, reload } = useApi<Delivery[]>(driverId ? `/deliveries/driver/${driverId}` : null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [locating, setLocating] = useState<string | null>(null);

  async function updateStatus(deliveryId: string, status: string) {
    setUpdating(deliveryId);
    try {
      await api.put(`/deliveries/${deliveryId}/status`, { status });
      toast.success(`Delivery ${status.toLowerCase()}`);
      reload();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Update failed');
    } finally {
      setUpdating(null);
    }
  }

  async function updateWithLocation(deliveryId: string, status: string) {
    setUpdating(deliveryId);
    setLocating(deliveryId);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('Geolocation unavailable'));
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
      });
      await api.put(`/deliveries/${deliveryId}/status`, {
        status,
        location: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          address: 'Current location',
        },
      });
      toast.success(`Delivery ${status.toLowerCase()}`);
      reload();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          (err as Error).message ??
          'Update failed'
      );
    } finally {
      setUpdating(null);
      setLocating(null);
    }
  }

  if (!driverId) {
    return <EmptyState title="No driver profile" description="You need a driver account to view deliveries." />;
  }

  const active = (data ?? []).filter((d) => d.status === 'ASSIGNED' || d.status === 'IN_TRANSIT');
  const past = (data ?? []).filter((d) => d.status === 'DELIVERED' || d.status === 'CANCELLED');

  return (
    <div>
      <PageHeader title="My deliveries" description="Pickups and drop-offs assigned to you." />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center text-sm text-danger">{error}</Card>
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState icon={<Truck className="h-10 w-10" />} title="No deliveries yet" description="Assigned deliveries will appear here." />
      ) : (
        <div className="space-y-8">
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Active ({active.length})</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {active.map((d) => (
                <Card key={d.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">{d.deliveryCode}</CardTitle>
                      <StatusBadge status={d.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p className="flex items-center gap-2 text-navy">
                      <MapPin className="h-4 w-4 text-primary" /> {d.destination ?? d.destinationSchoolCode ?? 'Destination TBA'}
                    </p>
                    <p className="text-muted">{(d.orderIds ?? []).length} order(s) on board · Created {formatDateTime(d.createdAt)}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {d.status === 'ASSIGNED' ? (
                        <Button size="sm" onClick={() => updateWithLocation(d.id, 'IN_TRANSIT')} disabled={updating === d.id}>
                          {locating === d.id ? 'Locating…' : <><Navigation className="h-4 w-4" /> Start trip</>}
                        </Button>
                      ) : null}
                      {d.status === 'IN_TRANSIT' ? (
                        <Button size="sm" variant="success" onClick={() => updateWithLocation(d.id, 'DELIVERED')} disabled={updating === d.id}>
                          {locating === d.id ? 'Locating…' : 'Mark delivered'}
                        </Button>
                      ) : null}
                      <Button size="sm" variant="outline" onClick={() => updateStatus(d.id, 'CANCELLED')} disabled={updating === d.id}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">History ({past.length})</h2>
            <div className="space-y-2">
              {past.map((d) => (
                <Card key={d.id}>
                  <CardContent className="flex items-center justify-between gap-4 py-4">
                    <div>
                      <p className="font-medium text-navy">{d.deliveryCode}</p>
                      <p className="text-xs text-muted">
                        {d.destination ?? 'Destination TBA'} · {formatDateTime(d.createdAt)}
                      </p>
                    </div>
                    <Badge variant={d.status === 'DELIVERED' ? 'success' : 'muted'}>{d.status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
