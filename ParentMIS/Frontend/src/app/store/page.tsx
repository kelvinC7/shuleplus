'use client';

import { useMemo, useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  BookOpen,
  Dumbbell,
  Shirt,
  Package,
  CheckCircle2,
  AlertCircle,
  Receipt,
} from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { useStudentFetch } from '@/hooks/use-fetch';
import { useAuth } from '@/contexts/auth-context';
import { formatDate, formatCurrency } from '@/lib/format';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';

interface StoreProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  imageUrl: string | null;
}

interface StoreOrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface StoreOrder {
  id: string;
  date: string;
  total: number;
  status: string;
  items: StoreOrderItem[];
}

interface StoreResponse {
  products: StoreProduct[];
  orders: StoreOrder[];
}

function categoryMeta(category: string) {
  switch (category) {
    case 'Stationery':
      return { icon: <BookOpen className="size-6" />, cls: 'from-sky-500/15 to-sky-500/5 text-sky-600' };
    case 'Sports':
      return { icon: <Dumbbell className="size-6" />, cls: 'from-emerald-500/15 to-emerald-500/5 text-emerald-600' };
    case 'Uniform':
      return { icon: <Shirt className="size-6" />, cls: 'from-violet-500/15 to-violet-500/5 text-violet-600' };
    default:
      return { icon: <Package className="size-6" />, cls: 'from-amber-500/15 to-amber-500/5 text-amber-600' };
  }
}

export default function StorePage() {
  const { data, loading, error, reload } = useStudentFetch<StoreResponse>('/store');
  const { studentParams } = useAuth();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  const products = data?.products ?? [];
  const orders = data?.orders ?? [];
  const cartItems = products.filter((p) => (cart[p.id] ?? 0) > 0);
  const cartCount = cartItems.reduce((s, p) => s + (cart[p.id] ?? 0), 0);
  const cartTotal = cartItems.reduce((s, p) => s + (cart[p.id] ?? 0) * p.price, 0);

  const setQty = (id: string, delta: number) => {
    setCart((prev) => {
      const next = { ...prev };
      const current = next[id] ?? 0;
      const updated = Math.max(0, current + delta);
      if (updated === 0) delete next[id];
      else next[id] = updated;
      return next;
    });
  };

  const placeOrder = async () => {
    setPlacing(true);
    setOrderError(null);
    setOrderSuccess(null);
    try {
      await api.post('/store/orders', {
        items: cartItems.map((p) => ({ productId: p.id, quantity: cart[p.id] })),
        ...studentParams,
      });
      setOrderSuccess('Order placed successfully!');
      setCart({});
      setCartOpen(false);
      reload();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to place order. Please try again.';
      setOrderError(message);
    } finally {
      setPlacing(false);
    }
  };

  const orderCount = useMemo(() => orders.length, [orders]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ShuleStore"
        title="School Store"
        action={
          <button
            onClick={() => setCartOpen(true)}
            className="relative inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-navy shadow-md shadow-primary/20 transition-all hover:shadow-lg"
          >
            <ShoppingBag className="size-4" />
            Cart
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-white text-xs font-bold text-navy shadow">
                {cartCount}
              </span>
            )}
          </button>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={<AlertCircle className="text-red-500" />} title="Unable to load the store" description={error} />
      ) : products.length === 0 ? (
        <EmptyState title="Store is empty" description="Products will appear here as the school adds them." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const meta = categoryMeta(p.category);
            const qty = cart[p.id] ?? 0;
            return (
              <div
                key={p.id}
                className="hr-card flex flex-col p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-soft-lg"
              >
                <div className={cn('flex h-28 items-center justify-center rounded-2xl bg-gradient-to-br', meta.cls)}>
                  {meta.icon}
                </div>
                <div className="mt-4 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-navy">{p.name}</h3>
                    <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{p.category}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-navy px-3 py-1 text-xs font-bold text-primary">
                    {formatCurrency(p.price)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{p.stock} in stock</p>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                  {qty === 0 ? (
                    <button
                      onClick={() => setQty(p.id, 1)}
                      disabled={p.stock === 0}
                      className="btn-secondary px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus className="size-4" />
                      Add to Cart
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5">
                      <button onClick={() => setQty(p.id, -1)} className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100">
                        <Minus className="size-4" />
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-navy">{qty}</span>
                      <button
                        onClick={() => setQty(p.id, 1)}
                        disabled={qty >= p.stock}
                        className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                  )}
                  <span className="text-sm font-bold text-navy">
                    {formatCurrency((cart[p.id] ?? 0) * p.price)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="font-bold text-navy">Your Cart</h2>
              <button onClick={() => setCartOpen(false)} className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-50">
                <Trash2 className="size-5" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
              {cartItems.length === 0 ? (
                <EmptyState title="Your cart is empty" description="Add items from the store to get started." />
              ) : (
                cartItems.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-navy">{p.name}</p>
                      <p className="text-xs text-slate-500">{formatCurrency(p.price)} each</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button onClick={() => setQty(p.id, -1)} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-100">
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold text-navy">{cart[p.id]}</span>
                      <button onClick={() => setQty(p.id, 1)} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-100">
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="border-t border-slate-100 px-6 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-500">Total</span>
                  <span className="text-xl font-bold text-navy">{formatCurrency(cartTotal)}</span>
                </div>
                {orderError && (
                  <p className="mt-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-700">{orderError}</p>
                )}
                {orderSuccess && (
                  <p className="mt-2 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">{orderSuccess}</p>
                )}
                <button onClick={placeOrder} disabled={placing} className="btn-primary mt-3 w-full">
                  {placing ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="size-4 animate-spin rounded-full border-2 border-navy/30 border-t-navy" />
                      Placing order...
                    </span>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" />
                      Place Order
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order history */}
      {!loading && !error && orderCount > 0 && (
        <div className="hr-card overflow-x-auto">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="font-bold text-navy">Order History</h2>
            <Receipt className="size-5 text-primary" />
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50/70">
                <th className="px-6 py-3 text-left font-semibold text-slate-500">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Items</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/50">
                  <td className="px-6 py-4 text-slate-500">{formatDate(o.date)}</td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-navy">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">{o.status}</span>
                  </td>
                  <td className="px-4 py-4 text-right font-bold text-navy">{formatCurrency(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
