'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2, PackageSearch } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { postData } from '@/services/api';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select, Label } from '@/components/ui/input';
import { Spinner } from '@/components/shared/loading';
import { formatRwf } from '@/lib/format';
import type { Supplier, SupplierProduct } from '@/types';

interface CartLine {
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

function NewPurchaseInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [supplierId, setSupplierId] = useState(params.get('supplier') ?? '');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: suppliers } = useApi<Supplier[]>('/suppliers');
  const { data: products, loading: productsLoading } = useApi<SupplierProduct[]>(
    supplierId ? `/suppliers/${supplierId}/products` : null
  );

  const total = cart.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

  function addToCart(p: SupplierProduct) {
    const existing = cart.find((l) => l.productId === p.id);
    if (existing) {
      setCart(cart.map((l) => (l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l)));
    } else {
      setCart([...cart, { productId: p.id, name: p.name, quantity: 1, unitPrice: Number(p.price) }]);
    }
  }

  function updateQty(i: number, qty: number) {
    setCart(cart.map((l, idx) => (idx === i ? { ...l, quantity: Math.max(1, qty) } : l)));
  }

  async function submit() {
    if (!supplierId) return toast.error('Select a supplier');
    if (cart.length === 0) return toast.error('Add at least one item');
    setSaving(true);
    try {
      const order = await postData<{ id: string }>('/orders', {
        supplierId,
        items: cart.map((l) => ({
          productId: l.productId,
          name: l.name,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
        notes: notes || undefined,
      });
      toast.success('Order placed');
      router.push(`/app/track-order?order=${order.id}`);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Order failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New purchase order"
        description="Select a supplier and add items from their catalog."
        backHref="/app/purchases"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>1 · Supplier</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Choose a supplier…</option>
                {(suppliers ?? [])
                  .filter((s) => s.status === 'ACTIVE')
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.companyName}
                    </option>
                  ))}
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2 · Items</CardTitle>
            </CardHeader>
            <CardContent>
              {!supplierId ? (
                <EmptyState icon={<PackageSearch className="h-10 w-10" />} title="Pick a supplier first" description="Their catalog will load here." />
              ) : productsLoading ? (
                <div className="flex justify-center py-10">
                  <Spinner className="h-8 w-8" />
                </div>
              ) : (products?.length ?? 0) === 0 ? (
                <EmptyState title="No catalog items" description="This supplier has no products listed yet." />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {products?.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-navy">{p.name}</p>
                        <p className="text-xs text-muted">
                          {p.category ?? p.unit ?? ''} · {formatRwf(p.price)}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => addToCart(p)}>
                        <Plus /> Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="lg:sticky lg:top-20">
            <CardHeader>
              <CardTitle>3 · Review order</CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">Cart is empty.</p>
              ) : (
                <div className="space-y-3">
                  {cart.map((l, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-navy">{l.name}</p>
                        <p className="text-xs text-muted">{formatRwf(l.unitPrice)} each</p>
                      </div>
                      <Input
                        type="number"
                        value={l.quantity}
                        onChange={(e) => updateQty(i, Number(e.target.value))}
                        className="h-8 w-16 text-center"
                      />
                      <span className="w-20 text-right font-semibold">{formatRwf(l.quantity * l.unitPrice)}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCart(cart.filter((_, idx) => idx !== i))}>
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-border pt-3 text-sm font-bold text-navy">
                    <span>Total</span>
                    <span>{formatRwf(total)}</span>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery instructions…" />
                  </div>
                  <Button className="w-full" onClick={submit} disabled={saving}>
                    {saving ? 'Placing…' : 'Place order'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function NewPurchasePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <NewPurchaseInner />
    </Suspense>
  );
}
