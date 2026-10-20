'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Backpack, Filter, Package, RotateCcw, School, Search, Trash2, Wallet } from 'lucide-react';
import { shulekitAdminApi } from '@/lib/shulekit-admin-api';
import { useToast } from '@/shared/notifications/toast/toast';
import {
  ShuleKitDataPanel,
  ShuleKitFilterCard,
  ShuleKitIconBtn,
  ShuleKitPageShell,
  ShuleKitPagination,
  ShuleKitStatCard,
  ShuleKitTable,
  skBtnNavy,
  skBtnOutline,
  skBtnPrimary,
  skSearchInputClass,
  skSelectClass,
} from './shulekit-page-shell';

const PAGE_SIZE = 8;

export function ShuleKitStandardKitsView() {
  const toast = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [applied, setApplied] = useState({ search: '', district: '', year: '' });
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    shulekitAdminApi
      .listStandardKits()
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
  const years = useMemo(
    () => [...new Set(rows.map((r) => String(r.academicYear || '')).filter(Boolean))].sort().reverse(),
    [rows]
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const q = applied.search.trim().toLowerCase();
      if (q) {
        const hay = `${r.name ?? ''} ${r.organizationName ?? ''} ${r.className ?? ''} ${r.district ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (applied.district && String(r.district) !== applied.district) return false;
      if (applied.year && String(r.academicYear) !== applied.year) return false;
      return true;
    });
  }, [rows, applied]);

  const stats = useMemo(() => {
    const total = rows.length;
    const items = rows.reduce(
      (s, r) => s + Number((r._count as any)?.items ?? (r.items as any[])?.length ?? 0),
      0
    );
    const revenue = rows.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);
    return { total, items, revenue };
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, filtered.length);

  async function remove(id: string) {
    if (!window.confirm('Remove this standard kit?')) return;
    try {
      await shulekitAdminApi.deleteStandardKit(id);
      toast.success('Standard kit removed');
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <ShuleKitPageShell
      title="Standard Kits"
      description="Imported Babyeyi circular kits ready for parent purchase."
      actions={
        <Link href="/super-admin/shulekit/district-kits" className={skBtnPrimary}>
          <School className="h-4 w-4" />
          Import from District Kits
        </Link>
      }
    >
      <ShuleKitFilterCard>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_auto_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className={skSearchInputClass}
              placeholder="Search kit, school, class…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setApplied({ search, district: filterDistrict, year: filterYear });
                  setPage(1);
                }
              }}
            />
          </label>
          <select className={skSelectClass} value={filterDistrict} onChange={(e) => setFilterDistrict(e.target.value)}>
            <option value="">All districts</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select className={skSelectClass} value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setApplied({ search, district: filterDistrict, year: filterYear });
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
              setFilterDistrict('');
              setFilterYear('');
              setApplied({ search: '', district: '', year: '' });
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
        <ShuleKitStatCard icon={<Backpack className="h-4 w-4" />} label="Total Kits" value={stats.total} tone="navy" />
        <ShuleKitStatCard icon={<Package className="h-4 w-4" />} label="Total Items" value={stats.items} tone="sky" />
        <ShuleKitStatCard
          icon={<Wallet className="h-4 w-4" />}
          label="Catalog Value"
          value={`${stats.revenue.toLocaleString()} FRW`}
          tone="amber"
        />
      </div>

      <ShuleKitDataPanel loading={loading} loadingLabel="Loading standard kits…">
        <div className="hidden md:block">
          <ShuleKitTable
            headers={['#', 'Kit', 'School', 'District', 'Year/Term', 'Class', 'Items', 'Total', '']}
            empty={!paged.length}
            emptyLabel="No standard kits match your filters."
          >
            {paged.map((r, idx) => (
              <tr key={r.id as string} className="border-t border-border hover:bg-slate-50/70">
                <td className="px-4 py-3 text-muted">{from + idx}</td>
                <td className="px-4 py-3 font-semibold text-navy">{r.name as string}</td>
                <td className="px-4 py-3">{(r.organizationName as string) ?? '—'}</td>
                <td className="px-4 py-3">{(r.district as string) ?? '—'}</td>
                <td className="px-4 py-3">
                  {r.academicYear as string} / {r.term as string}
                </td>
                <td className="px-4 py-3">{r.className as string}</td>
                <td className="px-4 py-3">{(r._count as any)?.items ?? (r.items as any[])?.length ?? 0}</td>
                <td className="px-4 py-3 font-medium text-navy">{Number(r.totalAmount).toLocaleString()}</td>
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
            <li className="px-4 py-10 text-center text-sm text-muted">No standard kits match your filters.</li>
          ) : (
            paged.map((r) => (
              <li key={r.id as string} className="space-y-2 px-4 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-navy">{r.name as string}</p>
                    <p className="text-xs text-muted">
                      {(r.organizationName as string) ?? '—'} · {(r.district as string) ?? '—'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void remove(r.id as string)}
                    className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600"
                  >
                    Delete
                  </button>
                </div>
                <p className="text-xs text-muted">
                  {r.academicYear as string} / {r.term as string} · {r.className as string} ·{' '}
                  {(r._count as any)?.items ?? (r.items as any[])?.length ?? 0} items
                </p>
                <p className="text-sm font-semibold text-navy">{Number(r.totalAmount).toLocaleString()} FRW</p>
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
          noun="kits"
          onPageChange={setPage}
        />
      </ShuleKitDataPanel>
    </ShuleKitPageShell>
  );
}
