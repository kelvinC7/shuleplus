'use client';

import { useRouter } from 'next/navigation';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Card } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { Spinner } from '@/components/shared/loading';
import { formatRwf, formatDateTime } from '@/lib/format';
import type { PurchaseOrder } from '@/types';

export default function OrdersPage() {
  const router = useRouter();
  const { data: orders, loading, error } = useApi<PurchaseOrder[]>('/orders');

  return (
    <div>
      <PageHeader title="Orders" description="Purchase orders placed by canteens." />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center text-sm text-danger">{error}</Card>
      ) : (orders?.length ?? 0) === 0 ? (
        <EmptyState title="No orders yet" description="Orders placed at the POS will appear here." />
      ) : (
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>Order</TH>
                <TH>Supplier</TH>
                <TH>Total</TH>
                <TH>Status</TH>
                <TH>Delivery</TH>
                <TH>Created</TH>
              </TR>
            </THead>
            <TBody>
              {orders?.map((o) => (
                <TR key={o.id} onClick={() => router.push(`/app/track-order?order=${o.id}`)} className="cursor-pointer">
                  <TD className="font-mono text-xs">{o.orderNumber}</TD>
                  <TD className="font-medium text-navy">{o.supplierName}</TD>
                  <TD className="font-semibold">{formatRwf(o.totalAmount)}</TD>
                  <TD>
                    <StatusBadge status={o.status} />
                  </TD>
                  <TD>{o.deliveryStatus ? <StatusBadge status={o.deliveryStatus} /> : '—'}</TD>
                  <TD className="text-muted">{formatDateTime(o.createdAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
