'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { MainLayout } from '@/layouts/main-layout';
import { inventoryApi } from '@/services/inventory-api';
import type { Product, ProductCategory, Supplier, ProductStockSummary, Store } from '@/types';
import { Plus, ChevronDown, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ExportDropdown } from '@/components/export-dropdown';
import type { ExportColumn } from '@/lib/export-utils';
import { sanitizeProductPayload } from '@/lib/form-payload';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { PlatformDataTable, type PlatformTableColumn } from '@/components/platform-data-table';
import { InventoryFilterBar, type InventoryListFilters } from '@/components/inventory-filter-bar';
import { isWithinDateRange } from '@/components/inventory-date-range-picker';

const UOM_OPTIONS = [
  { value: 'EA', label: 'EA (Each)' },
  { value: 'PCS', label: 'PCS (Pieces)' },
  { value: 'KG', label: 'KG (Kilogram)' },
  { value: 'G', label: 'G (Gram)' },
  { value: 'L', label: 'L (Liter)' },
  { value: 'ML', label: 'ML (Milliliter)' },
  { value: 'M', label: 'M (Meter)' },
  { value: 'CM', label: 'CM (Centimeter)' },
  { value: 'Box', label: 'Box' },
  { value: 'Carton', label: 'Carton' },
  { value: 'Pair', label: 'Pair' },
  { value: 'Set', label: 'Set' },
  { value: 'Dozen', label: 'Dozen' },
  { value: 'Roll', label: 'Roll' },
  { value: 'Pack', label: 'Pack' },
  { value: 'Packet', label: 'Packet' },
  { value: 'Bottle', label: 'Bottle' },
  { value: 'Can', label: 'Can' },
  { value: 'Tube', label: 'Tube' },
  { value: 'Bag', label: 'Bag' },
  { value: 'Pallet', label: 'Pallet' },
];

const initialFormState = {
  name: '',
  sku: '',
  categoryId: '',
  unitOfMeasure: 'KG',
  reorderLevel: '',
  brand: '',
  description: '',
  supplierId: '',
  storageLocation: '',
  quantity: '',
  storeId: '',
};

const INITIAL_FILTERS: InventoryListFilters = {
  search: '',
  categoryId: '',
  status: '',
  dateRange: {},
};

function stockBadge(status: string) {
  if (status === 'OUT_OF_STOCK') {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
        Out of Stock
      </span>
    );
  }
  if (status === 'LOW_STOCK') {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
        Low Stock
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
      In Stock
    </span>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [stockMap, setStockMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState<InventoryListFilters>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Product | null>(null);
  const [form, setForm] = useState(initialFormState);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [uomOpen, setUomOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, c, s, stock, st] = await Promise.all([
        inventoryApi.products.list({ search: filters.search || undefined }),
        inventoryApi.categories.list(),
        inventoryApi.suppliers.list(),
        inventoryApi.products.stockSummary(),
        inventoryApi.stores.list(),
      ]);
      setProducts(p);
      setCategories(c);
      setSuppliers(s);
      setStores(st);
      const map = new Map<string, number>();
      stock.forEach((item: ProductStockSummary) => map.set(item.id, item.totalStock));
      setStockMap(map);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [filters.search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, filters.search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, filters.search]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (filters.categoryId && p.categoryId !== filters.categoryId) return false;
      if (filters.status && p.status !== filters.status) return false;
      if (!isWithinDateRange(p.createdAt, filters.dateRange)) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [products, filters]);

  const pagedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const resetForm = () => {
    setForm(initialFormState);
    setEditItem(null);
    setCategoryQuery('');
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditItem(p);
    setForm({
      name: p.name,
      sku: p.sku,
      categoryId: p.categoryId || '',
      unitOfMeasure: p.unitOfMeasure,
      reorderLevel: p.reorderLevel?.toString() || '',
      brand: p.brand || '',
      description: p.description || '',
      supplierId: p.supplierId || '',
      storageLocation: p.storageLocation || '',
      quantity: '',
      storeId: '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.categoryId) {
      toast.error('Please select a category');
      return;
    }

    setSaving(true);
    try {
      const body = sanitizeProductPayload(form);

      if (editItem) {
        delete body.quantity;
        await inventoryApi.products.update(editItem.id, body);
        toast.success(`"${editItem.name}" updated`);
      } else {
        await inventoryApi.products.create(body);
        toast.success('Product created');
      }

      setDialogOpen(false);
      setTimeout(() => resetForm(), 250);
      await load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Error saving product';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (p: Product) => {
    toast(`Delete "${p.name}"?`, {
      description: 'This product will be permanently deleted.',
      duration: 8000,
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            await inventoryApi.products.remove(p.id);
            await load();
            toast.success(`"${p.name}" deleted`);
          } catch (err: unknown) {
            const message =
              (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              'Delete failed';
            toast.error(message);
          }
        },
      },
      cancel: { label: 'Cancel', onClick: () => {} },
    });
  };

  const handleCreateCategory = async () => {
    if (!categoryQuery.trim()) return;
    setCreatingCategory(true);
    try {
      const newCat = await inventoryApi.categories.create({ name: categoryQuery.trim() });
      setCategories((prev) => [...prev, newCat]);
      setForm((prev) => ({ ...prev, categoryId: newCat.id }));
      setCategoryOpen(false);
      setCategoryQuery('');
      toast.success(`Category "${newCat.name}" created`);
    } catch {
      toast.error('Failed to create category');
    } finally {
      setCreatingCategory(false);
    }
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(categoryQuery.toLowerCase())
  );
  const exactCategoryMatch = categories.some(
    (c) => c.name.toLowerCase() === categoryQuery.toLowerCase()
  );
  const selectedCategory = categories.find((c) => c.id === form.categoryId);

  const exportColumns: ExportColumn[] = [
    { header: 'Name', accessor: 'name' },
    { header: 'SKU', accessor: 'sku' },
    { header: 'Category', accessor: 'category' },
    { header: 'Supplier', accessor: 'supplier' },
    { header: 'Quantity', accessor: 'quantity' },
    { header: 'Status', accessor: 'status' },
    { header: 'Unit', accessor: 'unit' },
    { header: 'Created', accessor: 'created' },
  ];

  const exportData = filteredProducts.map((p) => ({
    name: p.name,
    sku: p.sku,
    category: p.category?.name || '-',
    supplier: p.supplier?.name || '-',
    quantity: stockMap.get(p.id) ?? 0,
    status: p.status,
    unit: p.unitOfMeasure,
    created: format(new Date(p.createdAt), 'dd MMM yyyy'),
  }));

  const columns: PlatformTableColumn<Product>[] = [
    {
      key: 'name',
      header: 'Product',
      render: (p) => (
        <div>
          <p className="font-semibold text-[#000435]">{p.name}</p>
          <p className="text-xs text-slate-500">{p.sku}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (p) => <span className="text-slate-600">{p.category?.name || '—'}</span>,
    },
    {
      key: 'supplier',
      header: 'Supplier',
      className: 'hidden md:table-cell',
      render: (p) => <span className="text-slate-600">{p.supplier?.name || '—'}</span>,
    },
    {
      key: 'qty',
      header: 'Qty',
      className: 'text-center',
      render: (p) => (
        <span className="font-semibold text-[#000435]">{stockMap.get(p.id) ?? 0}</span>
      ),
    },
    {
      key: 'status',
      header: 'Stock',
      className: 'text-center',
      render: (p) => stockBadge(p.status),
    },
    {
      key: 'created',
      header: 'Added',
      className: 'hidden lg:table-cell',
      render: (p) => (
        <span className="text-slate-500">{format(new Date(p.createdAt), 'dd MMM yyyy')}</span>
      ),
    },
  ];

  if (loading) {
    return (
      <MainLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#fcb038]" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-5">
        <div className="page-header flex-col items-stretch gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-[#000435] sm:text-2xl">Product catalog</h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'} · manage SKUs, stock & suppliers
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ExportDropdown title="Products" columns={exportColumns} data={exportData} />
            <button type="button" onClick={openCreate} className="btn-primary h-10 gap-2 px-4 text-sm">
              <Plus className="h-4 w-4" />
              Add Product
            </button>
          </div>
        </div>

        <InventoryFilterBar
          filters={filters}
          onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch } as typeof prev))}
          onClear={() => setFilters(INITIAL_FILTERS)}
          selectFilters={[
            {
              key: 'categoryId',
              allLabel: 'All categories',
              options: categories.map((c) => ({ value: c.id, label: c.name })),
            },
            {
              key: 'status',
              allLabel: 'All statuses',
              options: [
                { value: 'ACTIVE', label: 'Active' },
                { value: 'LOW_STOCK', label: 'Low stock' },
                { value: 'OUT_OF_STOCK', label: 'Out of stock' },
                { value: 'INACTIVE', label: 'Inactive' },
              ],
            },
          ]}
          searchPlaceholder="Search by name or SKU…"
        />

        <PlatformDataTable
          columns={columns}
          data={pagedProducts}
          rowKey={(p) => p.id}
          loading={loading}
          emptyMessage="No products match your filters"
          emptyAction={
            <button type="button" onClick={openCreate} className="btn-primary mt-2 px-4 py-2 text-sm">
              Add first product
            </button>
          }
          page={page}
          pageSize={pageSize}
          total={filteredProducts.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          onEdit={openEdit}
          onDelete={handleDelete}
        />

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setDialogOpen(false);
              setTimeout(() => resetForm(), 250);
            }
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
            <DialogHeader className="border-b border-slate-100 pb-4">
              <DialogTitle className="text-lg font-bold text-[#000435]">
                {editItem ? 'Edit Product' : 'New Product'}
              </DialogTitle>
              <p className="text-sm text-slate-500">
                {editItem ? 'Update product details and reorder settings.' : 'Add a product to your inventory catalog.'}
              </p>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5 pt-2">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Name *
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className="input h-11"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    SKU
                  </label>
                  <input
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="input h-11"
                    placeholder="Auto-generated if empty"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Category *
                  </label>
                  <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                    <PopoverTrigger
                      render={
                        <button
                          type="button"
                          className="input flex h-11 w-full items-center justify-between text-left"
                        />
                      }
                    >
                      <span className={selectedCategory ? 'text-[#000435]' : 'text-slate-400'}>
                        {selectedCategory?.name || 'Select category'}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${categoryOpen ? 'rotate-180' : ''}`}
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-[--anchor-width] rounded-xl p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Search category..."
                          value={categoryQuery}
                          onValueChange={setCategoryQuery}
                        />
                        <CommandList>
                          {categoryQuery && filteredCategories.length === 0 && !exactCategoryMatch ? (
                            <CommandEmpty>
                              <button
                                type="button"
                                onClick={handleCreateCategory}
                                disabled={creatingCategory}
                                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-[#fcb038] hover:bg-amber-50"
                              >
                                {creatingCategory ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Plus className="h-4 w-4" />
                                )}
                                {creatingCategory ? 'Creating…' : `Create "${categoryQuery}"`}
                              </button>
                            </CommandEmpty>
                          ) : (
                            <CommandEmpty>No category found.</CommandEmpty>
                          )}
                          <CommandGroup>
                            {filteredCategories.map((c) => (
                              <CommandItem
                                key={c.id}
                                value={c.name}
                                onSelect={() => {
                                  setForm({ ...form, categoryId: c.id });
                                  setCategoryOpen(false);
                                }}
                              >
                                <Check
                                  className={`h-4 w-4 ${form.categoryId === c.id ? 'opacity-100' : 'opacity-0'}`}
                                />
                                {c.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Supplier
                  </label>
                  <SearchableSelect
                    value={form.supplierId}
                    onChange={(v) => setForm({ ...form, supplierId: v })}
                    options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
                    placeholder="Search supplier"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Unit of measure
                  </label>
                  <Popover open={uomOpen} onOpenChange={setUomOpen}>
                    <PopoverTrigger
                      render={
                        <button
                          type="button"
                          className="input flex h-11 w-full items-center justify-between text-left"
                        />
                      }
                    >
                      <span className={form.unitOfMeasure ? 'text-[#000435]' : 'text-slate-400'}>
                        {form.unitOfMeasure || 'Select unit'}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${uomOpen ? 'rotate-180' : ''}`}
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-[--anchor-width] rounded-xl p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Search or type custom..."
                          value={form.unitOfMeasure}
                          onValueChange={(v) => setForm({ ...form, unitOfMeasure: v })}
                        />
                        <CommandList>
                          <CommandEmpty>No matching unit. Type your own above.</CommandEmpty>
                          <CommandGroup heading="Common units">
                            {UOM_OPTIONS.map((u) => (
                              <CommandItem
                                key={u.value}
                                value={u.label}
                                onSelect={() => {
                                  setForm({ ...form, unitOfMeasure: u.value });
                                  setUomOpen(false);
                                }}
                              >
                                <Check
                                  className={`h-4 w-4 ${form.unitOfMeasure === u.value ? 'opacity-100' : 'opacity-0'}`}
                                />
                                {u.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Reorder level
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.reorderLevel}
                    onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                    className="input h-11"
                    placeholder="Optional"
                  />
                </div>

                {!editItem ? (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Initial quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                      className="input h-11"
                      placeholder="Optional"
                    />
                  </div>
                ) : null}

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Brand
                  </label>
                  <input
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="input h-11"
                  />
                </div>

                {!editItem ? (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Store
                    </label>
                    <SearchableSelect
                      value={form.storeId}
                      onChange={(v) => setForm({ ...form, storeId: v })}
                      options={stores.filter((s) => s.isActive).map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}
                      placeholder="Select store"
                    />
                  </div>
                ) : null}

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="input min-h-[88px] resize-y py-3"
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 border-t border-slate-100 pt-4 sm:gap-2">
                <DialogClose render={<button type="button" className="btn-secondary px-5 py-2.5 text-sm" disabled={saving} />}>
                  Cancel
                </DialogClose>
                <button type="submit" disabled={saving} className="btn-primary min-w-[120px] px-5 py-2.5 text-sm">
                  {saving ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </span>
                  ) : editItem ? (
                    'Update'
                  ) : (
                    'Create'
                  )}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
