'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Filter, RotateCcw, Search, Truck } from 'lucide-react';
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

const DELIVERY_STATUSES = ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED'];
const PAGE_SIZE = 8;

export function ShuleKitDeliveriesView() {
  const toast = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [applied, setApplied] = useState({ search: '', status: '', district: '' });
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    shulekitAdminApi
      .listDeliveries()
      .then(setRows)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const districts = useMemo(
    () => [...new Set(rows.map((r) => String(r.district || '')).filter(Boolean))].sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const q = applied.search.trim().toLowerCase();
      if (q) {
        const hay = `${r.trackingCode ?? ''} ${(r.request as any)?.requestNumber ?? ''} ${(r.request as any)?.studentName ?? ''} ${r.district ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (applied.status && String(r.status) !== applied.status) return false;
      if (applied.district && String(r.district) !== applied.district) return false;
      return true;
    });
  }, [rows, applied]);

  const stats = useMemo(() => {
    const pending = rows.filter((r) => ['PENDING', 'ASSIGNED'].includes(String(r.status))).length;
    const inTransit = rows.filter((r) => ['IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(String(r.status))).length;
    const delivered = rows.filter((r) => String(r.status) === 'DELIVERED').length;
    return { pending, inTransit, delivered };
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, filtered.length);

  async function updateStatus(id: string, status: string) {
    try {
      await shulekitAdminApi.updateDelivery(id, { status });
      toast.success(`Delivery → ${status}`);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <ShuleKitPageShell title="Deliveries" description="Tracking, ETA, and delivery status updates.">
      <ShuleKitFilterCard>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_auto_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className={skSearchInputClass}
              placeholder="Search tracking, order, student…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setApplied({ search, status: filterStatus, district: filterDistrict });
                  setPage(1);
                }
              }}
            />
          </label>
          <select className={skSelectClass} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            {DELIVERY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select className={skSelectClass} value={filterDistrict} onChange={(e) => setFilterDistrict(e.target.value)}>
            <option value="">All districts</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setApplied({ search, status: filterStatus, district: filterDistrict });
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
              setFilterStatus('');
              setFilterDistrict('');
              setApplied({ search: '', status: '', district: '' });
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
        <ShuleKitStatCard icon={<Truck className="h-4 w-4" />} label="Pending" value={stats.pending} tone="amber" />
        <ShuleKitStatCard icon={<Truck className="h-4 w-4" />} label="In Transit" value={stats.inTransit} tone="sky" />
        <ShuleKitStatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Delivered" value={stats.delivered} tone="emerald" />
      </div>

      <ShuleKitDataPanel loading={loading} loadingLabel="Loading deliveries…">
        <div className="hidden md:block">
          <ShuleKitTable
            headers={['#', 'Tracking', 'Order', 'Student', 'Method', 'District', 'Fee', 'Status', 'Update']}
            empty={!paged.length}
            emptyLabel="No deliveries match your filters."
          >
            {paged.map((r, idx) => (
              <tr key={r.id as string} className="border-t border-border hover:bg-slate-50/70">
                <td className="px-4 py-3 text-muted">{from + idx}</td>
                <td className="px-4 py-3 font-semibold text-navy">{(r.trackingCode as string) ?? '—'}</td>
                <td className="px-4 py-3">{(r.request as any)?.requestNumber ?? '—'}</td>
                <td className="px-4 py-3">{(r.request as any)?.studentName ?? '—'}</td>
                <td className="px-4 py-3">{r.method as string}</td>
                <td className="px-4 py-3">{(r.district as string) ?? '—'}</td>
                <td className="px-4 py-3 font-medium text-navy">{Number(r.fee).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <ShuleKitStatusPill status={r.status as string} />
                </td>
                <td className="px-4 py-3">
                  <select
                    className="rounded-lg border border-border bg-white px-2 py-1.5 text-xs text-navy outline-none focus:border-primary"
                    value={r.status as string}
                    onChange={(e) => void updateStatus(r.id as string, e.target.value)}
                  >
                    {DELIVERY_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </ShuleKitTable>
        </div>

        <ul className="divide-y divide-border md:hidden">
          {paged.length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-muted">No deliveries match your filters.</li>
          ) : (
            paged.map((r) => (
              <li key={r.id as string} className="space-y-2 px-4 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-navy">{(r.trackingCode as string) ?? '—'}</p>
                    <p className="text-xs text-muted">
                      {(r.request as any)?.requestNumber ?? '—'} · {(r.request as any)?.studentName ?? '—'}
                    </p>
                  </div>
                  <ShuleKitStatusPill status={r.status as string} />
                </div>
                <p className="text-xs text-muted">
                  {r.method as string} · {(r.district as string) ?? '—'} · {Number(r.fee).toLocaleString()} FRW
                </p>
                <select
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy"
                  value={r.status as string}
                  onChange={(e) => void updateStatus(r.id as string, e.target.value)}
                >
                  {DELIVERY_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
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
          noun="deliveries"
          onPageChange={setPage}
        />
      </ShuleKitDataPanel>
    </ShuleKitPageShell>
  );
}
