'use client';

import { Truck, Phone, Car, IdCard, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/format';

export default function DriverProfilePage() {
  const { profile } = useAuth();
  const driver = profile?.driver;

  if (!driver) {
    return <Card className="p-8 text-center text-sm text-danger">No driver profile linked to this account.</Card>;
  }

  const rows = [
    { icon: Phone, label: 'Phone', value: driver.phone ?? '—' },
    { icon: Car, label: 'Vehicle', value: driver.vehicleType ?? '—' },
    { icon: IdCard, label: 'Plate number', value: driver.plateNumber ?? '—' },
    {
      icon: MapPin,
      label: 'Current location',
      value: driver.currentLocation
        ? `${driver.currentLocation.lat?.toFixed(4) ?? '—'}, ${driver.currentLocation.lng?.toFixed(4) ?? '—'}`
        : 'Not shared',
    },
  ];

  return (
    <div>
      <PageHeader title="Driver profile" description="Your account details." />

      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
                <Truck className="h-7 w-7 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{driver.fullName}</CardTitle>
                <div className="mt-1">
                  <Badge variant={driver.isAvailable ? 'success' : 'muted'}>
                    {driver.isAvailable ? 'Available' : 'On delivery'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="flex items-center gap-2 text-muted">
                    <r.icon className="h-4 w-4" /> {r.label}
                  </span>
                  <span className="font-medium text-navy">{r.value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="text-muted">Driver code</span>
                <span className="font-medium text-navy">{driver.driverCode}</span>
              </div>
              <div className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="text-muted">Joined</span>
                <span className="font-medium text-navy">{formatDateTime(driver.createdAt)}</span>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-navy">
              {driver.supplier ? `Verified driver for ${driver.supplier.companyName}.` : 'Linked to a supplier fleet.'}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
