'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Backpack, Filter, Package, Percent, Plus, RotateCcw, Search, Trash2, X } from 'lucide-react';
import { shulekitAdminApi } from '@/lib/shulekit-admin-api';
import { useToast } from '@/shared/notifications/toast/toast';
import {
  ShuleKitDataPanel,
  ShuleKitFilterCard,
  ShuleKitIconBtn,
  ShuleKitPageShell,
  ShuleKitPagination,
  ShuleKitStatCard,
  ShuleKitStatusPill,
  ShuleKitTable,
  skBtnNavy,
  skBtnOutline,
  skBtnPrimary,
  skInputClass,
  skSearchInputClass,
  skSelectClass,
} from './shulekit-page-shell';

const PAGE_SIZE = 8;

export function ShuleKitPricingView() {
  const toast = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [kits, setKits] = useState<any[]>([]);
  const [form, setForm] = useState({ productId: '', standardKitId: '', sellingPrice: '', discountPct: '0' });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([shulekitAdminApi.listPricing(), shulekitAdminApi.listProducts(), shulekitAdminApi.listStandardKits()])
      .then(([pricing, prods, std]) => {
        setRows(pricing);
        setProducts(prods);
        setKits(std);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = String((r.product as any)?.name ?? (r.standardKit as any)?.name ?? '');
      return name.toLowerCase().includes(q);
    });
  }, [rows, appliedSearch]);

  const stats = useMemo(() => {
    const total = rows.length;
    const productRules = rows.filter((r) => r.productId || (r.product as any)?.id).length;
    const kitRules = rows.filter((r) => r.standardKitId || (r.standardKit as any)?.id).length;
    return { total, productRules, kitRules };
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, filtered.length);

  async function create() {
    try {
      await shulekitAdminApi.upsertPricing({
        productId: form.productId || undefined,
        standardKitId: form.standardKitId || undefined,
        sellingPrice: Number(form.sellingPrice),
        discountPct: Number(form.discountPct || 0),
      });
      setForm({ productId: '', standardKitId: '', sellingPrice: '', discountPct: '0' });
      setModalOpen(false);
      toast.success('Pricing rule saved');
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this pricing rule?')) return;
    try {
      await shulekitAdminApi.deletePricing(id);
      toast.success('Pricing rule deleted');
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <ShuleKitPageShell
      title="Pricing Rules"
      description="Override selling prices and discounts for products or standard kits."
      actions={
        <button type="button" onClick={() => setModalOpen(true)} className={skBtnPrimary}>
          <Plus className="h-4 w-4" />
          Add Rule
        </button>
      }
    >
      <ShuleKitFilterCard>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className={skSearchInputClass}
              placeholder="Search by product or kit…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setAppliedSearch(search);
                  setPage(1);
                }
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setAppliedSearch(search);
              setPage(1);
            }}
            className={skBtnNavy}
          >
            <Filter className="h-4 w-4" />
            Filter
          </button>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setAppliedSearch('');
              setPage(1);
            }}
            className={skBtnOutline}
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </ShuleKitFilterCard>

      <div className="grid gap-3 sm:grid-cols-3">
        <ShuleKitStatCard icon={<Percent className="h-4 w-4" />} label="Total Rules" value={stats.total} tone="navy" />
        <ShuleKitStatCard icon={<Package className="h-4 w-4" />} label="Product Rules" value={stats.productRules} tone="sky" />
        <ShuleKitStatCard icon={<Backpack className="h-4 w-4" />} label="Kit Rules" value={stats.kitRules} tone="amber" />
      </div>

      <ShuleKitDataPanel loading={loading} loadingLabel="Loading pricing rules…">
        <div className="hidden md:block">
          <ShuleKitTable
            headers={['#', 'Target', 'Selling price', 'Discount %', 'Available', '']}
            empty={!paged.length}
            emptyLabel="No pricing rules match your filters."
          >
            {paged.map((r, idx) => (
              <tr key={r.id as string} className="border-t border-border hover:bg-slate-50/70">
                <td className="px-4 py-3 text-muted">{from + idx}</td>
                <td className="px-4 py-3 font-semibold text-navy">
                  {(r.product as any)?.name ?? (r.standardKit as any)?.name ?? '—'}
                </td>
                <td className="px-4 py-3 font-medium text-navy">{Number(r.sellingPrice).toLocaleString()}</td>
                <td className="px-4 py-3">{Number(r.discountPct)}</td>
                <td className="px-4 py-3">
                  <ShuleKitStatusPill status={r.available ? 'AVAILABLE' : 'INACTIVE'} />
                </td>
                <td className="px-4 py-3 text-right">
                  <ShuleKitIconBtn label="Delete" danger onClick={() => void remove(r.id as string)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </ShuleKitIconBtn>
                </td>
              </tr>
            ))}
          </ShuleKitTable>
        </div>

        <ul className="divide-y divide-border md:hidden">
          {paged.length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-muted">No pricing rules match your filters.</li>
          ) : (
            paged.map((r) => (
              <li key={r.id as string} className="flex items-center justify-between gap-3 px-4 py-4">
                <div>
                  <p className="font-semibold text-navy">
                    {(r.product as any)?.name ?? (r.standardKit as any)?.name ?? '—'}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    {Number(r.sellingPrice).toLocaleString()} FRW · {Number(r.discountPct)}% off
                  </p>
                  <div className="mt-1.5">
                    <ShuleKitStatusPill status={r.available ? 'AVAILABLE' : 'INACTIVE'} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(r.id as string)}
                  className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600"
                >
                  Delete
                </button>
              </li>
            ))
          )}
        </ul>

        <ShuleKitPagination
          page={currentPage}
          totalPages={totalPages}
          from={from}
          to={to}
          total={filtered.length}
          noun="rules"
          onPageChange={setPage}
        />
      </ShuleKitDataPanel>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-lg rounded-t-2xl border border-border bg-white shadow-xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
              <h2 className="text-lg font-bold text-navy">Add pricing rule</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full border border-border p-1.5 text-muted hover:bg-slate-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 p-4 sm:p-5">
              <label className="block text-sm">
                <span className="text-xs font-medium text-muted">Product (optional)</span>
                <select
                  className={`mt-1 ${skSelectClass} w-full`}
                  value={form.productId}
                  onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value, standardKitId: '' }))}
                >
                  <option value="">Select product…</option>
                  {products.map((p) => (
                    <option key={p.id as string} value={p.id as string}>
                      {p.name as string}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-xs font-medium text-muted">Standard kit (optional)</span>
                <select
                  className={`mt-1 ${skSelectClass} w-full`}
                  value={form.standardKitId}
                  onChange={(e) => setForm((f) => ({ ...f, standardKitId: e.target.value, productId: '' }))}
                >
                  <option value="">Select kit…</option>
                  {kits.map((k) => (
                    <option key={k.id as string} value={k.id as string}>
                      {k.name as string}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-xs font-medium text-muted">Selling price (FRW)</span>
                <input
                  className={`mt-1 ${skInputClass}`}
                  placeholder="e.g. 2500"
                  value={form.sellingPrice}
                  onChange={(e) => setForm((f) => ({ ...f, sellingPrice: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-medium text-muted">Discount %</span>
                <input
                  className={`mt-1 ${skInputClass}`}
                  placeholder="0"
                  value={form.discountPct}
                  onChange={(e) => setForm((f) => ({ ...f, discountPct: e.target.value }))}
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className={skBtnOutline}>
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!form.sellingPrice || (!form.productId && !form.standardKitId)}
                  onClick={() => void create()}
                  className={skBtnNavy}
                >
                  Save rule
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </ShuleKitPageShell>
  );
}
