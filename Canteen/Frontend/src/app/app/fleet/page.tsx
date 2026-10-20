'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/shared/loading';
import { formatDateTime } from '@/lib/format';
import type { Driver, Delivery } from '@/types';

export default function FleetPage() {
  const { data: drivers, loading: driversLoading } = useApi<Driver[]>('/drivers');
  const { data: deliveries, loading: deliveriesLoading } = useApi<Delivery[]>('/deliveries');

  return (
    <div>
      <PageHeader
        title="Fleet & drivers"
        description="Drivers and active deliveries across suppliers."
        actions={
          <Link href="/app/register-driver">
            <Button>
              <Plus /> Register driver
            </Button>
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Drivers</CardTitle>
        </CardHeader>
        <CardContent>
          {driversLoading ? (
            <div className="flex justify-center py-10">
              <Spinner className="h-8 w-8" />
            </div>
          ) : (drivers?.length ?? 0) === 0 ? (
            <EmptyState title="No drivers" description="Register a driver to start dispatching deliveries." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Driver</TH>
                  <TH>Phone</TH>
                  <TH>Vehicle</TH>
                  <TH>Plate</TH>
                  <TH>Status</TH>
                  <TH>Available</TH>
                </TR>
              </THead>
              <TBody>
                {drivers?.map((d) => (
                  <TR key={d.id}>
                    <TD className="font-medium text-navy">{d.fullName}</TD>
                    <TD>{d.phone ?? '—'}</TD>
                    <TD>{d.vehicleType ?? '—'}</TD>
                    <TD className="font-mono text-xs">{d.plateNumber ?? '—'}</TD>
                    <TD>
                      <StatusBadge status={d.status} />
                    </TD>
                    <TD>{d.isAvailable ? 'Yes' : 'On delivery'}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Deliveries</CardTitle>
        </CardHeader>
        <CardContent>
          {deliveriesLoading ? (
            <div className="flex justify-center py-10">
              <Spinner className="h-8 w-8" />
            </div>
          ) : (deliveries?.length ?? 0) === 0 ? (
            <EmptyState title="No deliveries" description="Assigned deliveries will show here." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Code</TH>
                  <TH>Status</TH>
                  <TH>Destination</TH>
                  <TH>Created</TH>
                </TR>
              </THead>
              <TBody>
                {deliveries?.map((d) => (
                  <TR key={d.id}>
                    <TD className="font-mono text-xs">{d.deliveryCode}</TD>
                    <TD>
                      <StatusBadge status={d.status} />
                    </TD>
                    <TD>{d.destinationSchoolCode ?? d.destination ?? '—'}</TD>
                    <TD className="text-muted">{formatDateTime(d.createdAt)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
