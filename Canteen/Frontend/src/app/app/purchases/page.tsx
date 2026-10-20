'use client';

import Link from 'next/link';
import { Plus, ShoppingCart } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Spinner } from '@/components/shared/loading';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { formatRwf, formatDateTime } from '@/lib/format';
import type { PurchaseOrder } from '@/types';

export default function PurchasesPage() {
  const { data, loading, error } = useApi<PurchaseOrder[]>('/orders');

  return (
    <div>
      <PageHeader
        title="Purchases"
        description="Purchase orders raised against your suppliers."
        actions={
          <Link href="/app/purchases/new">
            <Button>
              <Plus /> New order
            </Button>
          </Link>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center text-sm text-danger">{error}</Card>
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="h-10 w-10" />}
          title="No purchase orders yet"
          description="Raise your first order against a supplier's catalog."
        />
      ) : (
        <Card>
          <CardContent className="pt-0">
            <Table>
              <THead>
                <TR>
                  <TH>Order</TH>
                  <TH>Supplier</TH>
                  <TH>Total</TH>
                  <TH>Status</TH>
                  <TH>Created</TH>
                </TR>
              </THead>
              <TBody>
                {data?.map((o) => (
                  <TR key={o.id}>
                    <TD>
                      <Link href={`/app/track-order?order=${o.id}`} className="font-medium text-primary hover:underline">
                        {o.orderNumber}
                      </Link>
                    </TD>
                    <TD className="font-medium text-navy">{o.supplierName}</TD>
                    <TD className="font-semibold">{formatRwf(o.totalAmount)}</TD>
                    <TD>
                      <StatusBadge status={o.status} />
                    </TD>
                    <TD className="text-muted">{formatDateTime(o.createdAt)}</TD>
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
