'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ScanLine, Search, Plus, Minus, Trash2, CreditCard, CheckCircle2 } from 'lucide-react';
import { api, getData } from '@/services/api';
import { useApi } from '@/lib/use-api';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Spinner } from '@/components/shared/loading';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { formatRwf } from '@/lib/format';
import type { Wallet, MenuItem } from '@/types';

interface CartLine {
  name: string;
  quantity: number;
  unitPrice: number;
}

export default function SalesPage() {
  const { user } = useAuth();
  const { data: menu, loading: menuLoading } = useApi<MenuItem[]>('/menu-items');

  const [cardCode, setCardCode] = useState('');
  const [looking, setLooking] = useState(false);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState<{ saleNumber: string; amount: string; balance: string } | null>(null);

  async function lookup(code: string) {
    setLooking(true);
    setWallet(null);
    try {
      const w = await getData<Wallet>(`/wallets/by-card/${encodeURIComponent(code.trim().toUpperCase())}`);
      setWallet(w);
    } catch {
      toast.error('Student card not found');
    } finally {
      setLooking(false);
    }
  }

  function toggleItem(item: MenuItem) {
    const existing = cart.find((c) => c.name === item.name);
    if (existing) {
      setCart((c) => c.map((line) => (line.name === item.name ? { ...line, quantity: line.quantity + 1 } : line)));
    } else {
      setCart((c) => [...c, { name: item.name, quantity: 1, unitPrice: Number(item.price) }]);
    }
  }

  function changeQty(name: string, delta: number) {
    setCart((c) =>
      c
        .map((line) => (line.name === name ? { ...line, quantity: Math.max(0, line.quantity + delta) } : line))
        .filter((line) => line.quantity > 0)
    );
  }

  function clear() {
    setCart([]);
    setWallet(null);
    setReceipt(null);
    setCardCode('');
  }

  const total = cart.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

  async function complete() {
    if (!wallet) return toast.error('Scan a student card first');
    if (cart.length === 0) return toast.error('Add items to the sale');
    if (total <= 0) return;
    setProcessing(true);
    try {
      const result = await api.post('/sales/process', {
        cardCode: wallet.cardCode,
        amount: total,
        items: cart,
        operatorName: user?.email ?? undefined,
      });
      const sale = result.data.data;
      setReceipt({ saleNumber: sale.saleNumber, amount: sale.amount, balance: sale.newBalance });
      toast.success('Sale completed');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Sale failed');
    } finally {
      setProcessing(false);
    }
  }

  if (receipt) {
    return (
      <div className="mx-auto max-w-md">
        <Card className="p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-navy">Sale complete</h2>
          <p className="mt-1 text-sm text-muted">{wallet?.fullName} · {wallet?.cardCode}</p>
          <div className="mt-6 rounded-lg bg-muted/5 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Receipt</span>
              <span className="font-mono">{receipt.saleNumber}</span>
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-muted">Paid</span>
              <span className="font-bold text-navy">{formatRwf(receipt.amount)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted">New balance</span>
              <span className="font-semibold">{formatRwf(receipt.balance)}</span>
            </div>
          </div>
          <Button className="mt-6 w-full" onClick={clear}>
            New sale
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="New sale" description="Scan the student card, add items, and complete the sale." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <ScanLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  className="pl-9"
                  placeholder="Scan / enter card code (e.g. CARD-STU12345)"
                  value={cardCode}
                  onChange={(e) => setCardCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') lookup(cardCode);
                  }}
                />
              </div>
              <Button onClick={() => lookup(cardCode)} disabled={looking}>
                {looking ? <Spinner /> : <Search />} Find
              </Button>
            </div>

            {wallet ? (
              <div className="mt-4 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-8 w-8 text-emerald-600" />
                  <div>
                    <p className="font-semibold text-navy">{wallet.fullName}</p>
                    <p className="text-xs text-muted">{wallet.cardCode} · {wallet.className ?? '—'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted">Balance</p>
                  <p className="text-lg font-bold text-emerald-600">{formatRwf(wallet.balanceRwf)}</p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted">No card selected. Scan a student card to begin.</p>
            )}

            <h3 className="mt-6 font-semibold text-navy">Menu</h3>
            {menuLoading ? (
              <div className="flex justify-center py-10">
                <Spinner className="h-8 w-8" />
              </div>
            ) : (menu?.length ?? 0) === 0 ? (
              <EmptyState
                title="No menu items"
                description="Add menu items first so you can sell them."
              />
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {menu
                  ?.filter((m) => m.isActive)
                  .map((item) => {
                    const inCart = cart.find((c) => c.name === item.name)?.quantity ?? 0;
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleItem(item)}
                        className="flex items-center justify-between rounded-lg border border-border bg-white p-4 text-left transition-colors hover:border-primary"
                      >
                        <div>
                          <p className="font-medium text-navy">{item.name}</p>
                          <p className="text-xs text-muted">{item.category ?? '—'}</p>
                          <p className="mt-1 text-sm font-semibold text-primary">{formatRwf(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {inCart > 0 ? <Badge variant="success">×{inCart}</Badge> : null}
                          <Plus className="h-5 w-5 text-muted" />
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-navy">Cart</h3>
              {cart.length > 0 ? (
                <button onClick={() => setCart([])} className="text-xs text-muted hover:text-danger">
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            {cart.length === 0 ? (
              <p className="mt-6 text-center text-sm text-muted">Your cart is empty.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {cart.map((line) => (
                  <div key={line.name} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-navy">{line.name}</p>
                      <p className="text-xs text-muted">{formatRwf(line.unitPrice)} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => changeQty(line.name, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium">{line.quantity}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => changeQty(line.name, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 border-t border-border pt-4">
              <div className="flex justify-between text-sm text-muted">
                <span>Items</span>
                <span>{cart.reduce((s, l) => s + l.quantity, 0)}</span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="font-medium text-navy">Total</span>
                <span className="text-xl font-bold text-navy">{formatRwf(total)}</span>
              </div>
            </div>

            <Button
              className="mt-5 w-full"
              size="lg"
              disabled={!wallet || cart.length === 0 || processing}
              onClick={complete}
            >
              {processing ? <Spinner /> : <CreditCard />} Complete sale
            </Button>
            <p className="mt-2 text-center text-xs text-muted">
              {wallet ? `${formatRwf(total)} will be debited from the student card.` : 'Select a student card to enable checkout.'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
