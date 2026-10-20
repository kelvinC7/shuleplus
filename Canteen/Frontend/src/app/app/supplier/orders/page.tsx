'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PackageSearch } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useApi } from '@/lib/use-api';
import { api } from '@/services/api';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Spinner } from '@/components/shared/loading';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { formatRwf, formatDateTime } from '@/lib/format';
import type { PurchaseOrder } from '@/types';

export default function SupplierOrdersPage() {
  const { profile } = useAuth();
  const supplierId = profile?.supplierId ?? '';
  const { data, loading, error, reload } = useApi<PurchaseOrder[]>(supplierId ? `/orders/supplier/${supplierId}` : null);
  const [updating, setUpdating] = useState<string | null>(null);

  async function setStatus(orderId: string, status: string) {
    setUpdating(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      toast.success(`Order ${status.toLowerCase()}`);
      reload();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Update failed');
    } finally {
      setUpdating(null);
    }
  }

  if (!supplierId) {
    return <EmptyState title="No supplier profile" description="You need a supplier account to view orders." />;
  }

  return (
    <div>
      <PageHeader title="Supplier orders" description="Orders placed by canteens against your catalog." />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center text-sm text-danger">{error}</Card>
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState icon={<PackageSearch className="h-10 w-10" />} title="No orders yet" description="Canteen orders will appear here." />
      ) : (
        <Card>
          <CardContent className="pt-0">
            <Table>
              <THead>
                <TR>
                  <TH>Order</TH>
                  <TH>Items</TH>
                  <TH>Total</TH>
                  <TH>Status</TH>
                  <TH>Received</TH>
                  <TH>Action</TH>
                </TR>
              </THead>
              <TBody>
                {data?.map((o) => (
                  <TR key={o.id}>
                    <TD className="font-medium text-navy">{o.orderNumber}</TD>
                    <TD className="text-muted">{(o.items ?? []).length} line(s)</TD>
                    <TD className="font-semibold">{formatRwf(o.totalAmount)}</TD>
                    <TD>
                      <StatusBadge status={o.status} />
                    </TD>
                    <TD className="text-muted">{formatDateTime(o.createdAt)}</TD>
                    <TD>
                      {o.status === 'PENDING' ? (
                        <div className="flex gap-2">
                          <Button size="sm" variant="success" disabled={updating === o.id} onClick={() => setStatus(o.id, 'CONFIRMED')}>
                            Accept
                          </Button>
                          <Button size="sm" variant="outline" disabled={updating === o.id} onClick={() => setStatus(o.id, 'REJECTED')}>
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-muted">—</span>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
