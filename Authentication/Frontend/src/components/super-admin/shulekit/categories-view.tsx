'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Filter, FolderOpen, Layers, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
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
  skSearchInputClass,
  skSelectClass,
} from './shulekit-page-shell';

const PAGE_SIZE = 8;

export function ShuleKitCategoriesView() {
  const toast = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [applied, setApplied] = useState({ search: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    shulekitAdminApi
      .listCategories()
      .then(setRows)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const q = applied.search.trim().toLowerCase();
      if (q) {
        const hay = `${r.name ?? ''} ${r.slug ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (applied.status && String(r.status).toUpperCase() !== applied.status.toUpperCase()) return false;
      return true;
    });
  }, [rows, applied]);

  const stats = useMemo(() => {
    const total = rows.length;
    const withProducts = rows.filter((r) => Number((r._count as any)?.products ?? 0) > 0).length;
    const active = rows.filter((r) => String(r.status).toUpperCase() === 'ACTIVE' || !r.status).length;
    return { total, withProducts, active };
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, filtered.length);

  async function create() {
    if (!name.trim()) return;
    try {
      await shulekitAdminApi.createCategory({ name: name.trim() });
      setName('');
      toast.success('Category created');
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this category?')) return;
    try {
      await shulekitAdminApi.deleteCategory(id);
      toast.success('Category deleted');
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <ShuleKitPageShell
      title="Categories"
      description="Organize platform products for custom kits."
      actions={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <input
            className="rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-navy outline-none focus:border-primary sm:w-56"
            placeholder="New category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void create()}
          />
          <button type="button" disabled={!name.trim()} onClick={() => void create()} className={skBtnPrimary}>
            <Plus className="h-4 w-4" />
            Add Category
          </button>
        </div>
      }
    >
      <ShuleKitFilterCard>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[1.6fr_1fr_auto_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className={skSearchInputClass}
              placeholder="Search categories…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setApplied({ search, status: filterStatus });
                  setPage(1);
                }
              }}
            />
          </label>
          <select className={skSelectClass} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setApplied({ search, status: filterStatus });
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
              setApplied({ search: '', status: '' });
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
        <ShuleKitStatCard icon={<Layers className="h-4 w-4" />} label="Total Categories" value={stats.total} tone="navy" />
        <ShuleKitStatCard icon={<FolderOpen className="h-4 w-4" />} label="With Products" value={stats.withProducts} tone="sky" />
        <ShuleKitStatCard icon={<Layers className="h-4 w-4" />} label="Active" value={stats.active} tone="emerald" />
      </div>

      <ShuleKitDataPanel loading={loading} loadingLabel="Loading categories…">
        <div className="hidden md:block">
          <ShuleKitTable headers={['#', 'Name', 'Slug', 'Products', 'Status', '']} empty={!paged.length} emptyLabel="No categories match your filters.">
            {paged.map((r, idx) => (
              <tr key={r.id as string} className="border-t border-border hover:bg-slate-50/70">
                <td className="px-4 py-3 text-muted">{from + idx}</td>
                <td className="px-4 py-3 font-semibold text-navy">{r.name as string}</td>
                <td className="px-4 py-3 text-muted">{r.slug as string}</td>
                <td className="px-4 py-3">{(r._count as any)?.products ?? 0}</td>
                <td className="px-4 py-3">
                  <ShuleKitStatusPill status={(r.status as string) || 'ACTIVE'} />
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
            <li className="px-4 py-10 text-center text-sm text-muted">No categories match your filters.</li>
          ) : (
            paged.map((r) => (
              <li key={r.id as string} className="flex items-center justify-between gap-3 px-4 py-4">
                <div>
                  <p className="font-semibold text-navy">{r.name as string}</p>
                  <p className="text-xs text-muted">
                    {r.slug as string} · {(r._count as any)?.products ?? 0} products
                  </p>
                  <div className="mt-1.5">
                    <ShuleKitStatusPill status={(r.status as string) || 'ACTIVE'} />
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
          noun="categories"
          onPageChange={setPage}
        />
      </ShuleKitDataPanel>
    </ShuleKitPageShell>
  );
}
