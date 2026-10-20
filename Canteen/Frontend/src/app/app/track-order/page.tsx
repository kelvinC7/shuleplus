'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Truck, CheckCircle2, XCircle } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { api } from '@/services/api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge, Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/shared/loading';
import { formatRwf, formatDateTime } from '@/lib/format';
import type { PurchaseOrder, Delivery } from '@/types';

const ORDER_FLOW = ['PENDING', 'CONFIRMED', 'DISPATCHED', 'DELIVERED'];

function TrackOrderInner() {
  const params = useSearchParams();
  const id = params.get('order') ?? '';
  const { data, loading, error, reload } = useApi<PurchaseOrder & { supplier?: { companyName: string; phone: string | null }; delivery?: Delivery | null }>(
    id ? `/orders/${id}` : null
  );

  const [updating, setUpdating] = useState(false);

  async function setStatus(status: string) {
    setUpdating(true);
    try {
      await api.patch(`/orders/${id}/status`, { status });
      toast.success(`Order marked ${status}`);
      reload();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Update failed');
    } finally {
      setUpdating(false);
    }
  }

  if (!id) return <p className="text-sm text-muted">No order selected.</p>;
  if (loading) return <Spinner />;
  if (error) return <Card className="p-8 text-center text-sm text-danger">{error}</Card>;
  if (!data) return null;

  const currentIdx = ORDER_FLOW.indexOf(data.status);
  const step = (label: string, idx: number) => {
    const done = currentIdx > idx || data.status === 'DELIVERED';
    const active = currentIdx === idx;
    return (
      <div key={label} className="flex items-center gap-2 text-sm">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
            done ? 'bg-success text-white' : active ? 'bg-primary text-white' : 'bg-border text-muted'
          }`}
        >
          {done ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
        </span>
        <span className={active ? 'font-semibold text-navy' : done ? 'text-navy' : 'text-muted'}>{label}</span>
      </div>
    );
  };

  return (
    <div>
      <PageHeader title={data.orderNumber} description={`Raised ${formatDateTime(data.createdAt)} by ${data.createdByName ?? 'canteen'}`} backHref="/app/purchases" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Order progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-6">
                {ORDER_FLOW.map((s, i) => step(s.charAt(0) + s.slice(1).toLowerCase(), i))}
                {data.status === 'CANCELLED' || data.status === 'REJECTED' ? (
                  <span className="flex items-center gap-2 text-sm font-semibold text-danger">
                    <XCircle className="h-4 w-4" /> {data.status}
                  </span>
                ) : (
                  <Badge variant="success">
                    <StatusBadge status={data.status} />
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(data.items ?? []).map((item, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm">
                    <span className="font-medium text-navy">{item.name}</span>
                    <span className="text-muted">
                      {item.quantity} × {formatRwf(item.unitPrice)}
                    </span>
                    <span className="font-semibold">{formatRwf(item.quantity * item.unitPrice)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-2 text-base font-bold text-navy">
                  <span>Total</span>
                  <span>{formatRwf(data.totalAmount)}</span>
                </div>
                {data.notes ? <p className="px-4 text-sm text-muted">Notes: {data.notes}</p> : null}
              </div>
            </CardContent>
          </Card>

          {data.delivery ? (
            <Card>
              <CardHeader>
                <CardTitle>Delivery</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
                  <Truck className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-navy">{data.delivery.deliveryCode}</p>
                  <p className="text-sm text-muted">
                    Status: <StatusBadge status={data.delivery.status} /> · {data.delivery.destination ?? 'In transit'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div>
          <Card className="lg:sticky lg:top-20">
            <CardHeader>
              <CardTitle>Supplier</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium text-navy">{data.supplierName}</p>
              <p className="text-muted">{data.supplier?.phone ?? 'No phone listed'}</p>
              <p className="text-muted">{data.supplier?.companyName ?? ''}</p>
            </CardContent>
          </Card>

          {!['DELIVERED', 'CANCELLED', 'REJECTED'].includes(data.status) ? (
            <Card className="mt-4 lg:sticky lg:top-56">
              <CardHeader>
                <CardTitle>Update status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.status === 'PENDING' ? (
                  <Button variant="success" className="w-full" disabled={updating} onClick={() => setStatus('CONFIRMED')}>
                    Confirm order
                  </Button>
                ) : null}
                {data.status === 'CONFIRMED' ? (
                  <Button className="w-full" disabled={updating} onClick={() => setStatus('DISPATCHED')}>
                    Mark dispatched
                  </Button>
                ) : null}
                {data.status === 'DISPATCHED' ? (
                  <Button variant="success" className="w-full" disabled={updating} onClick={() => setStatus('DELIVERED')}>
                    Mark delivered
                  </Button>
                ) : null}
                {!['CANCELLED', 'REJECTED'].includes(data.status) && data.status !== 'DELIVERED' ? (
                  <Button variant="outline" className="w-full" disabled={updating} onClick={() => setStatus('CANCELLED')}>
                    Cancel order
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <TrackOrderInner />
    </Suspense>
  );
}
