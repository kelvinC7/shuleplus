'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Filter,
  ImagePlus,
  Loader2,
  Package,
  PackageX,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { shulekitAdminApi } from '@/lib/shulekit-admin-api';
import { useToast } from '@/shared/notifications/toast/toast';

type ProductRow = {
  id: string;
  name: string;
  sku?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  unitPrice: number | string;
  stockQty: number;
  status: string;
  customEligible?: boolean;
  category?: { id: string; name: string } | null;
  categoryId?: string | null;
};

type CategoryRow = { id: string; name: string };

type ProductForm = {
  name: string;
  sku: string;
  categoryId: string;
  status: string;
  unitPrice: string;
  stockQty: string;
  description: string;
  imageUrl: string;
  imagePreview: string;
};

const EMPTY_FORM: ProductForm = {
  name: '',
  sku: '',
  categoryId: '',
  status: 'ACTIVE',
  unitPrice: '',
  stockQty: '0',
  description: '',
  imageUrl: '',
  imagePreview: '',
};

const PAGE_SIZE = 8;

const CATEGORY_PILLS = [
  'bg-sky-50 text-sky-800',
  'bg-violet-50 text-violet-800',
  'bg-emerald-50 text-emerald-800',
  'bg-amber-50 text-amber-800',
  'bg-rose-50 text-rose-800',
  'bg-indigo-50 text-indigo-800',
];

function categoryPill(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i) * (i + 1)) % CATEGORY_PILLS.length;
  return CATEGORY_PILLS[hash];
}

export function ShuleKitProductsView({ customOnly = false }: { customOnly?: boolean }) {
  const toast = useToast();
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [applied, setApplied] = useState({
    search: '',
    category: '',
    status: '',
    min: '',
    max: '',
  });
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      shulekitAdminApi.listProducts(customOnly ? { customEligible: 'true' } : undefined),
      shulekitAdminApi.listCategories(),
    ])
      .then(([products, cats]) => {
        setRows(products as ProductRow[]);
        setCategories(cats as CategoryRow[]);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [customOnly, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const q = applied.search.trim().toLowerCase();
      if (q) {
        const hay = `${r.name} ${r.sku ?? ''} ${r.category?.name ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (applied.category && (r.category?.id ?? r.categoryId) !== applied.category) return false;
      if (applied.status && String(r.status).toUpperCase() !== applied.status.toUpperCase()) return false;
      const price = Number(r.unitPrice) || 0;
      if (applied.min !== '' && price < Number(applied.min)) return false;
      if (applied.max !== '' && price > Number(applied.max)) return false;
      return true;
    });
  }, [rows, applied]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => String(r.status).toUpperCase() === 'ACTIVE').length;
    const outOfStock = rows.filter((r) => Number(r.stockQty) <= 0).length;
    return { total, active, outOfStock };
  }, [rows]);

  function applyFilters() {
    setApplied({
      search,
      category: filterCategory,
      status: filterStatus,
      min: minPrice,
      max: maxPrice,
    });
    setPage(1);
  }

  function resetFilters() {
    setSearch('');
    setFilterCategory('');
    setFilterStatus('');
    setMinPrice('');
    setMaxPrice('');
    setApplied({ search: '', category: '', status: '', min: '', max: '' });
    setPage(1);
  }

  function openCreate() {
    setEditId(null);
    setForm({ ...EMPTY_FORM, status: 'ACTIVE' });
    setModalOpen(true);
  }

  function openEdit(row: ProductRow) {
    setEditId(row.id);
    setForm({
      name: row.name ?? '',
      sku: row.sku ?? '',
      categoryId: row.category?.id ?? row.categoryId ?? '',
      status: row.status ?? 'ACTIVE',
      unitPrice: String(row.unitPrice ?? ''),
      stockQty: String(row.stockQty ?? 0),
      description: row.description ?? '',
      imageUrl: row.imageUrl ?? '',
      imagePreview: row.imageUrl ?? '',
    });
    setModalOpen(true);
  }

  async function onImagePick(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Choose a PNG or JPG image');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result ?? '');
      setForm((f) => ({ ...f, imagePreview: dataUrl }));
      try {
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        const uploaded = await shulekitAdminApi.uploadImage({
          contentBase64: base64,
          fileName: file.name,
          mimeType: file.type,
        });
        setForm((f) => ({ ...f, imageUrl: uploaded.url, imagePreview: uploaded.url }));
      } catch (e) {
        toast.error((e as Error).message || 'Image upload failed');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function saveProduct() {
    if (!form.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    if (Number(form.unitPrice) < 0) {
      toast.error('Unit price is invalid');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim() || undefined,
      description: form.description.trim() || undefined,
      imageUrl: form.imageUrl || undefined,
      unitPrice: Number(form.unitPrice || 0),
      stockQty: Number(form.stockQty || 0),
      categoryId: form.categoryId || undefined,
      status: form.status || 'ACTIVE',
      customEligible: true,
    };
    try {
      if (editId) {
        await shulekitAdminApi.updateProduct(editId, payload);
        toast.success('Product updated');
      } else {
        await shulekitAdminApi.createProduct(payload);
        toast.success('Product created');
      }
      setModalOpen(false);
      setForm(EMPTY_FORM);
      setEditId(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this product?')) return;
    try {
      await shulekitAdminApi.deleteProduct(id);
      toast.success('Product deleted');
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const title = customOnly ? 'Custom Kit Products' : 'Products';
  const subtitle = customOnly
    ? 'Manage products parents can pick when building a custom kit.'
    : 'Platform product catalog with stock and pricing.';

  const from = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, filtered.length);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-navy sm:text-2xl">{title}</h1>
          <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-navy shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </header>

      <section className="rounded-2xl border border-border bg-white p-3 shadow-sm sm:p-4">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_0.9fr_0.9fr_auto_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className="w-full rounded-lg border border-border bg-white py-2.5 pl-9 pr-3 text-sm text-navy outline-none focus:border-primary"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </label>
          <select
            className="rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-navy outline-none focus:border-primary"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-navy outline-none focus:border-primary"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <div className="relative">
            <input
              type="number"
              min={0}
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 pr-12 text-sm text-navy outline-none focus:border-primary"
              placeholder="Min price"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">FRW</span>
          </div>
          <div className="relative">
            <input
              type="number"
              min={0}
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 pr-12 text-sm text-navy outline-none focus:border-primary"
              placeholder="Max price"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">FRW</span>
          </div>
          <button
            type="button"
            onClick={applyFilters}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-navy px-3 py-2.5 text-sm font-semibold text-white"
          >
            <Filter className="h-4 w-4" />
            Filter
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2.5 text-sm font-medium text-navy"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={<Package className="h-4 w-4" />} label="Total Products" value={stats.total} tone="navy" />
        <StatCard icon={<Package className="h-4 w-4" />} label="Active Products" value={stats.active} tone="sky" />
        <StatCard icon={<PackageX className="h-4 w-4" />} label="Out of Stock" value={stats.outOfStock} tone="amber" />
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading products…
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Image</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Price (FRW)</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-muted">
                        No products match your filters.
                      </td>
                    </tr>
                  ) : (
                    paged.map((r, idx) => (
                      <tr key={r.id} className="border-t border-border hover:bg-slate-50/70">
                        <td className="px-4 py-3 text-muted">{from + idx}</td>
                        <td className="px-4 py-3">
                          <ProductThumb url={r.imageUrl} name={r.name} />
                        </td>
                        <td className="px-4 py-3 font-semibold text-navy">{r.name}</td>
                        <td className="px-4 py-3 text-muted">{r.sku || '—'}</td>
                        <td className="px-4 py-3">
                          {r.category?.name ? (
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${categoryPill(r.category.name)}`}
                            >
                              {r.category.name}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-navy">
                          {Number(r.unitPrice).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">{r.stockQty}</td>
                        <td className="px-4 py-3">
                          <StatusPill status={r.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <IconBtn label="Edit" onClick={() => openEdit(r)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </IconBtn>
                            <IconBtn label="Delete" danger onClick={() => void remove(r.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </IconBtn>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-border md:hidden">
              {paged.length === 0 ? (
                <li className="px-4 py-10 text-center text-sm text-muted">No products match your filters.</li>
              ) : (
                paged.map((r) => (
                  <li key={r.id} className="space-y-3 px-4 py-4">
                    <div className="flex gap-3">
                      <ProductThumb url={r.imageUrl} name={r.name} large />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-navy">{r.name}</p>
                          <StatusPill status={r.status} />
                        </div>
                        <p className="mt-0.5 text-xs text-muted">SKU: {r.sku || '—'}</p>
                        <p className="mt-1 text-sm font-semibold text-navy">
                          {Number(r.unitPrice).toLocaleString()} FRW · Stock {r.stockQty}
                        </p>
                        {r.category?.name ? (
                          <span
                            className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${categoryPill(r.category.name)}`}
                          >
                            {r.category.name}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs font-semibold text-navy"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(r.id)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 py-2 text-xs font-semibold text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>

            <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted">
                Showing {from} to {to} of {filtered.length} products
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-navy disabled:opacity-40"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const n = i + 1;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold ${
                        n === currentPage ? 'bg-navy text-white' : 'border border-border text-navy'
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-navy disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {modalOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-navy/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close"
            onClick={() => !saving && setModalOpen(false)}
          />
          <div className="relative z-10 flex max-h-[min(94dvh,100%)] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3.5 sm:px-5">
              <h2 className="text-base font-semibold text-navy">
                {editId ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                type="button"
                className="rounded-lg p-1.5 text-muted hover:bg-slate-100"
                onClick={() => !saving && setModalOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-slate-50 px-4 py-6 text-center transition hover:border-navy/30">
                {form.imagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.imagePreview}
                    alt=""
                    className="mb-2 h-24 w-24 rounded-xl object-cover shadow-sm"
                  />
                ) : (
                  <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white text-navy shadow-sm">
                    <ImagePlus className="h-5 w-5" />
                  </span>
                )}
                <span className="text-sm font-medium text-navy">
                  {uploading ? 'Uploading…' : 'Upload product image'}
                </span>
                <span className="mt-0.5 text-xs text-muted">PNG, JPG up to 2MB</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={uploading || saving}
                  onChange={(e) => void onImagePick(e.target.files?.[0] ?? null)}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Product Name *"
                  value={form.name}
                  onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                  placeholder="e.g. Exercise Book A4"
                />
                <Field
                  label="SKU"
                  value={form.sku}
                  onChange={(v) => setForm((f) => ({ ...f, sku: v }))}
                  placeholder="e.g. EB-A4-001"
                />
                <label className="block text-xs font-medium text-navy">
                  Category
                  <select
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 text-sm text-navy outline-none focus:border-primary"
                    value={form.categoryId}
                    onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-medium text-navy">
                  Status
                  <select
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 text-sm text-navy outline-none focus:border-primary"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </label>
                <Field
                  label="Unit Price (FRW) *"
                  value={form.unitPrice}
                  onChange={(v) => setForm((f) => ({ ...f, unitPrice: v }))}
                  placeholder="0"
                  type="number"
                />
                <Field
                  label="Stock Quantity"
                  value={form.stockQty}
                  onChange={(v) => setForm((f) => ({ ...f, stockQty: v }))}
                  placeholder="0"
                  type="number"
                />
              </div>

              <label className="block text-xs font-medium text-navy">
                Description
                <textarea
                  className="mt-1 min-h-[88px] w-full resize-y rounded-lg border border-border px-3 py-2.5 text-sm text-navy outline-none focus:border-primary"
                  placeholder="Optional product details"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </label>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-5">
              <button
                type="button"
                disabled={saving}
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-navy"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || uploading || !form.name.trim()}
                onClick={() => void saveProduct()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editId ? 'Save Changes' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block text-xs font-medium text-navy">
      {label}
      <input
        type={type}
        className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 text-sm text-navy outline-none focus:border-primary"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone: 'navy' | 'sky' | 'amber';
}) {
  const tones = {
    navy: 'bg-navy/10 text-navy',
    sky: 'bg-sky-100 text-sky-800',
    amber: 'bg-amber-100 text-amber-800',
  };
  return (
    <div className="rounded-2xl border border-border bg-white px-4 py-3.5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</span>
        <div>
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="text-xl font-semibold text-navy">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = String(status || '').toUpperCase();
  if (s === 'ACTIVE') {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
        Active
      </span>
    );
  }
  if (s === 'INACTIVE') {
    return (
      <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
        Inactive
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
      {status || '—'}
    </span>
  );
}

function ProductThumb({
  url,
  name,
  large,
}: {
  url?: string | null;
  name: string;
  large?: boolean;
}) {
  const size = large ? 'h-14 w-14' : 'h-10 w-10';
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={name} className={`${size} rounded-lg object-cover ring-1 ring-border`} />
    );
  }
  return (
    <span className={`inline-flex ${size} items-center justify-center rounded-lg bg-navy/5 text-navy`}>
      <Package className="h-4 w-4" />
    </span>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
        danger
          ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
          : 'border-border text-navy hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}
