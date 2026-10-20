'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Filter,
  Package,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { shulekitAdminApi } from '@/lib/shulekit-admin-api';
import { useToast } from '@/shared/notifications/toast/toast';
import {
  ShuleKitDataPanel,
  ShuleKitFilterCard,
  ShuleKitPageShell,
  ShuleKitPagination,
  ShuleKitStatCard,
  ShuleKitStatusPill,
  ShuleKitTable,
  skBtnNavy,
  skBtnOutline,
  skSearchInputClass,
  skSelectClass,
} from './shulekit-page-shell';

const STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
  'PAID',
  'APPROVED',
];

const PAGE_SIZE = 8;

export function ShuleKitOrdersView() {
  const toast = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [applied, setApplied] = useState({ search: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (applied.search) params.search = applied.search;
    if (applied.status) params.status = applied.status;
    shulekitAdminApi
      .listOrders(params)
      .then((d) => setRows(d.orders))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [applied, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const total = rows.length;
    const pending = rows.filter((r) => ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED'].includes(String(r.status))).length;
    const delivered = rows.filter((r) => String(r.status) === 'DELIVERED').length;
    return { total, pending, delivered };
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const from = rows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, rows.length);

  function applyFilters() {
    setApplied({ search, status });
    setPage(1);
  }

  function resetFilters() {
    setSearch('');
    setStatus('');
    setApplied({ search: '', status: '' });
    setPage(1);
  }

  async function open(id: string) {
    try {
      setSelected(await shulekitAdminApi.getOrder(id));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function setOrderStatus(id: string, next: string) {
    try {
      await shulekitAdminApi.updateOrderStatus(id, next);
      toast.success(`Status → ${next}`);
      load();
      if (selected?.id === id) setSelected(await shulekitAdminApi.getOrder(id));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function refund(id: string) {
    try {
      await shulekitAdminApi.refundOrder(id);
      toast.success('Order refunded');
      load();
      setSelected(await shulekitAdminApi.getOrder(id));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function printSlip() {
    if (!selected) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>${selected.requestNumber}</title></head><body>
      <h1>Packing slip / Invoice</h1>
      <p><b>${selected.requestNumber}</b> · ${selected.trackingNumber ?? ''}</p>
      <p>${selected.studentName} · ${selected.className ?? ''} · ${selected.organizationName ?? ''}</p>
      <p>Status: ${selected.status} · Total: ${Number(selected.total).toLocaleString()} FRW</p>
      <ul>${((selected.items as any[]) ?? []).map((i) => `<li>${i.title} × ${i.quantity} = ${Number(i.lineTotal).toLocaleString()}</li>`).join('')}</ul>
      <script>window.print()</script></body></html>`);
    w.document.close();
  }

  return (
    <ShuleKitPageShell
      title="Orders"
      description="Search, filter, update status, refund, and print packing slips."
    >
      <ShuleKitFilterCard>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[1.6fr_1fr_auto_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className={skSearchInputClass}
              placeholder="Search request #, student, school…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </label>
          <select className={skSelectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button type="button" onClick={applyFilters} className={skBtnNavy}>
            <Filter className="h-4 w-4" />
            Filter
          </button>
          <button type="button" onClick={resetFilters} className={skBtnOutline}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </ShuleKitFilterCard>

      <div className="grid gap-3 sm:grid-cols-3">
        <ShuleKitStatCard icon={<ClipboardList className="h-4 w-4" />} label="Total Orders" value={stats.total} tone="navy" />
        <ShuleKitStatCard icon={<Package className="h-4 w-4" />} label="In Progress" value={stats.pending} tone="amber" />
        <ShuleKitStatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Delivered" value={stats.delivered} tone="emerald" />
      </div>

      <ShuleKitDataPanel loading={loading} loadingLabel="Loading orders…">
        <div className="hidden md:block">
          <ShuleKitTable headers={['#', 'Request', 'Student', 'School', 'Type', 'Status', 'Total', '']} empty={!paged.length} emptyLabel="No orders match your filters.">
            {paged.map((r, idx) => (
              <tr key={r.id as string} className="border-t border-border hover:bg-slate-50/70">
                <td className="px-4 py-3 text-muted">{from + idx}</td>
                <td className="px-4 py-3 font-semibold text-navy">{r.requestNumber as string}</td>
                <td className="px-4 py-3">{r.studentName as string}</td>
                <td className="px-4 py-3">{(r.organizationName as string) ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                    {r.orderType as string}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <ShuleKitStatusPill status={r.status as string} />
                </td>
                <td className="px-4 py-3 font-medium text-navy">{Number(r.total).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="text-sm font-semibold text-navy hover:underline"
                    onClick={() => void open(r.id as string)}
                  >
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </ShuleKitTable>
        </div>

        <ul className="divide-y divide-border md:hidden">
          {paged.length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-muted">No orders match your filters.</li>
          ) : (
            paged.map((r) => (
              <li key={r.id as string} className="space-y-2 px-4 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-navy">{r.requestNumber as string}</p>
                    <p className="text-sm text-muted">{r.studentName as string}</p>
                  </div>
                  <ShuleKitStatusPill status={r.status as string} />
                </div>
                <p className="text-xs text-muted">{(r.organizationName as string) ?? '—'} · {r.orderType as string}</p>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-navy">{Number(r.total).toLocaleString()} FRW</p>
                  <button type="button" className="text-sm font-semibold text-navy" onClick={() => void open(r.id as string)}>
                    Open
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>

        <ShuleKitPagination
          page={currentPage}
          totalPages={totalPages}
          from={from}
          to={to}
          total={rows.length}
          noun="orders"
          onPageChange={setPage}
        />
      </ShuleKitDataPanel>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-border bg-white shadow-xl sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-white px-4 py-3 sm:px-5">
              <div>
                <h2 className="text-lg font-bold text-navy">{selected.requestNumber as string}</h2>
                <p className="text-sm text-muted">
                  Tracking: {(selected.trackingNumber as string) ?? '—'} · {selected.studentName as string}
                </p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-full border border-border p-1.5 text-muted hover:bg-slate-50" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={printSlip} className={skBtnOutline}>
                  Print slip
                </button>
                <button
                  type="button"
                  onClick={() => void refund(selected.id as string)}
                  className="inline-flex items-center justify-center rounded-lg border border-rose-200 px-3 py-2.5 text-sm font-semibold text-rose-600"
                >
                  Refund
                </button>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Update status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void setOrderStatus(selected.id as string, s)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        selected.status === s ? 'bg-navy text-white' : 'bg-slate-100 text-navy hover:bg-slate-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Items</p>
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {((selected.items as any[]) ?? []).map((i) => (
                    <li key={i.id as string} className="flex justify-between gap-3 px-3 py-2.5 text-sm">
                      <span className="text-navy">
                        {i.title as string} × {i.quantity as number}
                      </span>
                      <span className="font-semibold text-navy">{Number(i.lineTotal).toLocaleString()} FRW</span>
                    </li>
                  ))}
                  {!(selected.items as any[])?.length ? (
                    <li className="px-3 py-6 text-center text-sm text-muted">No items</li>
                  ) : null}
                </ul>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-muted">Total</span>
                <span className="text-lg font-bold text-navy">{Number(selected.total).toLocaleString()} FRW</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </ShuleKitPageShell>
  );
}
