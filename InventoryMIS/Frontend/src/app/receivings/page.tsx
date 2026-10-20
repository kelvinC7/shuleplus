'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { MainLayout } from '@/layouts/main-layout';
import { inventoryApi } from '@/services/inventory-api';
import type { StockReceiving, Supplier, Product, Store } from '@/types';
import { Plus, Loader2, Package, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { ExportDropdown } from '@/components/export-dropdown';
import type { ExportColumn } from '@/lib/export-utils';
import { sanitizeReceivingPayload } from '@/lib/receiving-payload';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { PlatformDataTable, type PlatformTableColumn } from '@/components/platform-data-table';
import { InventoryFilterBar, type InventoryFilterValues } from '@/components/inventory-filter-bar';
import type { InventoryDateRange } from '@/components/inventory-date-range-picker';

type ReceivingItemForm = {
  productId: string;
  quantity: number;
  unitCost: string;
  batchNumber: string;
  expiryDate: string;
};

const INITIAL_FORM = {
  storeId: '',
  supplierId: '',
  invoiceNumber: '',
  deliveryNoteNumber: '',
  notes: '',
  receivedDate: new Date().toISOString().split('T')[0],
  items: [] as ReceivingItemForm[],
};

const INITIAL_FILTERS: InventoryFilterValues & { supplierId: string; storeId: string } = {
  search: '',
  supplierId: '',
  storeId: '',
  dateRange: {} as InventoryDateRange,
};

function formatDateParam(d?: Date) {
  return d ? format(d, 'yyyy-MM-dd') : undefined;
}

export default function ReceivingsPage() {
  const [receivings, setReceivings] = useState<StockReceiving[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<StockReceiving | null>(null);
  const [editForm, setEditForm] = useState({
    supplierId: '',
    invoiceNumber: '',
    deliveryNoteNumber: '',
    notes: '',
    receivedDate: '',
  });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<StockReceiving | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  const loadMeta = useCallback(async () => {
    const [suppliersData, productsData, storesData] = await Promise.all([
      inventoryApi.suppliers.list(),
      inventoryApi.products.list({}),
      inventoryApi.stores.list(),
    ]);
    setSuppliers(suppliersData);
    setProducts(productsData);
    setStores(storesData);
  }, []);

  const loadReceivings = useCallback(async () => {
    try {
      const data = await inventoryApi.receivings.list({
        search: filters.search || undefined,
        supplierId: filters.supplierId || undefined,
        storeId: filters.storeId || undefined,
        dateFrom: formatDateParam(filters.dateRange.from),
        dateTo: formatDateParam(filters.dateRange.to),
      });
      setReceivings(data);
    } catch {
      toast.error('Failed to load stock receivings');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      void loadReceivings();
    }, filters.search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadReceivings, filters]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const pagedReceivings = useMemo(() => {
    const start = (page - 1) * pageSize;
    return receivings.slice(start, start + pageSize);
  }, [receivings, page, pageSize]);

  const resetForm = () => setForm(INITIAL_FORM);

  const openCreate = () => {
    resetForm();
    setForm((prev) => ({
      ...INITIAL_FORM,
      items: [{ productId: '', quantity: 1, unitCost: '', batchNumber: '', expiryDate: '' }],
    }));
    setDialogOpen(true);
  };

  const addItem = () => {
    setForm({
      ...form,
      items: [...form.items, { productId: '', quantity: 1, unitCost: '', batchNumber: '', expiryDate: '' }],
    });
  };

  const removeItem = (idx: number) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  };

  const updateItem = (idx: number, field: keyof ReceivingItemForm, value: string | number) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    setForm({ ...form, items });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.storeId) {
      toast.error('Please select a store');
      return;
    }
    if (!form.items.length || form.items.some((i) => !i.productId)) {
      toast.error('Add at least one product line');
      return;
    }

    setSaving(true);
    try {
      const body = sanitizeReceivingPayload(form);
      await inventoryApi.receivings.create(body);
      toast.success('Stock receiving recorded');
      setDialogOpen(false);
      resetForm();
      await loadReceivings();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Error saving receiving';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (row: StockReceiving) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(row);
    try {
      const full = await inventoryApi.receivings.getById(row.id);
      setDetail(full);
    } catch {
      toast.error('Could not load GRN details');
    } finally {
      setDetailLoading(false);
    }
  };

  const openEdit = (row: StockReceiving) => {
    setEditItem(row);
    setEditForm({
      supplierId: row.supplierId || '',
      invoiceNumber: row.invoiceNumber || '',
      deliveryNoteNumber: row.deliveryNoteNumber || '',
      notes: row.notes || '',
      receivedDate: row.receivedDate ? format(new Date(row.receivedDate), 'yyyy-MM-dd') : '',
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    setSaving(true);
    try {
      await inventoryApi.receivings.update(editItem.id, {
        supplierId: editForm.supplierId || null,
        invoiceNumber: editForm.invoiceNumber || null,
        deliveryNoteNumber: editForm.deliveryNoteNumber || null,
        notes: editForm.notes || null,
        receivedDate: editForm.receivedDate,
      });
      toast.success(`${editItem.grnNumber} updated`);
      setEditOpen(false);
      setEditItem(null);
      await loadReceivings();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Update failed';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (row: StockReceiving) => {
    toast(`Delete ${row.grnNumber}?`, {
      description: 'This reverses received stock and removes the GRN.',
      duration: 8000,
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            await inventoryApi.receivings.remove(row.id);
            toast.success(`${row.grnNumber} deleted`);
            await loadReceivings();
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

  const exportColumns: ExportColumn[] = [
    { header: 'GRN #', accessor: 'grnNumber' },
    { header: 'Store', accessor: 'store' },
    { header: 'Supplier', accessor: 'supplier' },
    { header: 'Items', accessor: 'items' },
    { header: 'Invoice', accessor: 'invoice' },
    { header: 'Delivery note', accessor: 'deliveryNote' },
    { header: 'Date', accessor: 'date' },
  ];

  const exportData = receivings.map((r) => ({
    grnNumber: r.grnNumber,
    store: r.store?.name || '—',
    supplier: r.supplier?.name || '—',
    items: r._count?.items ?? 0,
    invoice: r.invoiceNumber || '—',
    deliveryNote: r.deliveryNoteNumber || '—',
    date: format(new Date(r.receivedDate), 'dd MMM yyyy'),
  }));

  const columns: PlatformTableColumn<StockReceiving>[] = [
    {
      key: 'grn',
      header: 'GRN #',
      render: (r) => <span className="font-semibold text-[#000435]">{r.grnNumber}</span>,
    },
    {
      key: 'store',
      header: 'Store',
      className: 'hidden sm:table-cell',
      render: (r) => <span className="text-slate-600">{r.store?.name || '—'}</span>,
    },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (r) => <span className="text-slate-600">{r.supplier?.name || '—'}</span>,
    },
    {
      key: 'items',
      header: 'Items',
      className: 'text-center',
      render: (r) => (
        <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-[#000435]">
          {r._count?.items ?? 0}
        </span>
      ),
    },
    {
      key: 'invoice',
      header: 'Invoice',
      className: 'hidden md:table-cell text-center',
      render: (r) => <span className="text-slate-500">{r.invoiceNumber || '—'}</span>,
    },
    {
      key: 'date',
      header: 'Received',
      className: 'text-center',
      render: (r) => (
        <span className="text-slate-600">{format(new Date(r.receivedDate), 'dd MMM yyyy')}</span>
      ),
    },
  ];

  if (loading && receivings.length === 0 && !suppliers.length) {
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
            <h2 className="text-xl font-bold text-[#000435] sm:text-2xl">Stock Receiving</h2>
            <p className="mt-1 text-sm text-slate-500">
              {receivings.length} GRN{receivings.length === 1 ? '' : 's'} · record goods received notes
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ExportDropdown title="Stock Receiving" columns={exportColumns} data={exportData} />
            <button type="button" onClick={openCreate} className="btn-primary h-10 gap-2 px-4 text-sm">
              <Plus className="h-4 w-4" />
              New Receiving
            </button>
          </div>
        </div>

        <InventoryFilterBar
          filters={filters}
          onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch } as typeof prev))}
          onClear={() => setFilters(INITIAL_FILTERS)}
          selectFilters={[
            {
              key: 'supplierId',
              allLabel: 'All suppliers',
              options: suppliers.map((s) => ({ value: s.id, label: s.name })),
            },
            {
              key: 'storeId',
              allLabel: 'All stores',
              options: stores.filter((s) => s.isActive).map((s) => ({ value: s.id, label: s.name })),
            },
          ]}
          searchPlaceholder="Search GRN, invoice, delivery note…"
        />

        <PlatformDataTable
          columns={columns}
          data={pagedReceivings}
          rowKey={(r) => r.id}
          loading={loading}
          emptyMessage="No receivings match your filters"
          emptyAction={
            <button type="button" onClick={openCreate} className="btn-primary mt-2 px-4 py-2 text-sm">
              Record first receiving
            </button>
          }
          page={page}
          pageSize={pageSize}
          total={receivings.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          onView={(r) => void openDetail(r)}
          onEdit={openEdit}
          onDelete={handleDelete}
        />

        {/* Edit GRN modal (header fields — line items affect stock) */}
        <Dialog
          open={editOpen}
          onOpenChange={(open) => {
            if (!open) {
              setEditOpen(false);
              setEditItem(null);
            }
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
            <DialogHeader className="border-b border-slate-100 pb-4">
              <DialogTitle className="text-lg font-bold text-[#000435]">
                Edit {editItem?.grnNumber}
              </DialogTitle>
              <p className="text-sm text-slate-500">
                Update supplier, invoice, and notes. Product lines cannot be changed after stock is received.
              </p>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Supplier
                </label>
                <SearchableSelect
                  value={editForm.supplierId}
                  onChange={(v) => setEditForm({ ...editForm, supplierId: v })}
                  options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
                  placeholder="Select supplier"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Received date
                </label>
                <input
                  type="date"
                  value={editForm.receivedDate}
                  onChange={(e) => setEditForm({ ...editForm, receivedDate: e.target.value })}
                  required
                  className="input h-11"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Invoice number
                </label>
                <input
                  value={editForm.invoiceNumber}
                  onChange={(e) => setEditForm({ ...editForm, invoiceNumber: e.target.value })}
                  className="input h-11"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Delivery note
                </label>
                <input
                  value={editForm.deliveryNoteNumber}
                  onChange={(e) => setEditForm({ ...editForm, deliveryNoteNumber: e.target.value })}
                  className="input h-11"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Notes
                </label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="input min-h-[80px] resize-y py-3"
                  rows={2}
                />
              </div>
              <DialogFooter className="gap-2 border-t border-slate-100 pt-4">
                <DialogClose render={<button type="button" className="btn-secondary px-5 py-2.5 text-sm" disabled={saving} />}>
                  Cancel
                </DialogClose>
                <button type="submit" disabled={saving} className="btn-primary min-w-[100px] px-5 py-2.5 text-sm">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Create GRN modal */}
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setDialogOpen(false);
              setTimeout(resetForm, 200);
            }
          }}
        >
          <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-3xl">
            <DialogHeader className="border-b border-slate-100 pb-4">
              <DialogTitle className="text-lg font-bold text-[#000435]">New Goods Received Note</DialogTitle>
              <p className="text-sm text-slate-500">Record stock received into a store warehouse.</p>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5 pt-2">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Store *
                  </label>
                  <SearchableSelect
                    value={form.storeId}
                    onChange={(v) => setForm({ ...form, storeId: v })}
                    options={stores.filter((s) => s.isActive).map((s) => ({ value: s.id, label: s.name }))}
                    placeholder="Select store"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Supplier
                  </label>
                  <SearchableSelect
                    value={form.supplierId}
                    onChange={(v) => setForm({ ...form, supplierId: v })}
                    options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
                    placeholder="Select supplier"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Received date *
                  </label>
                  <input
                    type="date"
                    value={form.receivedDate}
                    onChange={(e) => setForm({ ...form, receivedDate: e.target.value })}
                    required
                    className="input h-11"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Invoice number
                  </label>
                  <input
                    value={form.invoiceNumber}
                    onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                    className="input h-11"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Delivery note
                  </label>
                  <input
                    value={form.deliveryNoteNumber}
                    onChange={(e) => setForm({ ...form, deliveryNoteNumber: e.target.value })}
                    className="input h-11"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Notes
                  </label>
                  <input
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="input h-11"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="hr-card space-y-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#000435]">
                    <Package size={16} className="text-[#fcb038]" />
                    Line items
                  </div>
                  <button type="button" onClick={addItem} className="text-sm font-semibold text-[#fcb038] hover:underline">
                    + Add item
                  </button>
                </div>

                {form.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:grid-cols-12 sm:items-end"
                  >
                    <div className="sm:col-span-5">
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Product *
                      </label>
                      <SearchableSelect
                        value={item.productId}
                        onChange={(v) => updateItem(idx, 'productId', v)}
                        options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
                        placeholder="Select product"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Qty *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                        required
                        className="input h-11"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Unit cost
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitCost}
                        onChange={(e) => updateItem(idx, 'unitCost', e.target.value)}
                        className="input h-11"
                        placeholder="Optional"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Batch #
                      </label>
                      <input
                        value={item.batchNumber}
                        onChange={(e) => updateItem(idx, 'batchNumber', e.target.value)}
                        className="input h-11"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Expiry
                      </label>
                      <input
                        type="date"
                        value={item.expiryDate}
                        onChange={(e) => updateItem(idx, 'expiryDate', e.target.value)}
                        className="input h-11"
                      />
                    </div>
                    <div className="flex sm:col-span-1 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-200 text-red-500 transition hover:bg-red-50"
                        aria-label="Remove line"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                {form.items.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-500">Add at least one product line.</p>
                ) : null}
              </div>

              <DialogFooter className="gap-2 border-t border-slate-100 pt-4 sm:gap-2">
                <DialogClose render={<button type="button" className="btn-secondary px-5 py-2.5 text-sm" disabled={saving} />}>
                  Cancel
                </DialogClose>
                <button type="submit" disabled={saving} className="btn-primary min-w-[140px] px-5 py-2.5 text-sm">
                  {saving ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </span>
                  ) : (
                    'Save receiving'
                  )}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Detail modal */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
            <DialogHeader className="border-b border-slate-100 pb-4">
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-[#000435]">
                <Eye size={18} className="text-[#fcb038]" />
                {detail?.grnNumber ?? 'GRN details'}
              </DialogTitle>
            </DialogHeader>

            {detailLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#fcb038]" />
              </div>
            ) : detail ? (
              <div className="space-y-4 pt-2">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['Store', detail.store?.name || '—'],
                    ['Supplier', detail.supplier?.name || '—'],
                    ['Invoice', detail.invoiceNumber || '—'],
                    ['Delivery note', detail.deliveryNoteNumber || '—'],
                    ['Received', format(new Date(detail.receivedDate), 'dd MMM yyyy')],
                    ['Items', String(detail.items?.length ?? detail._count?.items ?? 0)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                      <p className="mt-0.5 text-sm font-semibold text-[#000435]">{value}</p>
                    </div>
                  ))}
                </div>

                {detail.notes ? (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Notes</p>
                    <p className="mt-1 text-sm text-slate-600">{detail.notes}</p>
                  </div>
                ) : null}

                {detail.items?.length ? (
                  <div className="hr-card overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50 text-left">
                          <th className="px-3 py-2 font-semibold text-[#000435]">Product</th>
                          <th className="px-3 py-2 text-center font-semibold text-[#000435]">Qty</th>
                          <th className="hidden px-3 py-2 text-center font-semibold text-[#000435] sm:table-cell">
                            Batch
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.items.map((item) => (
                          <tr key={item.id} className="border-b last:border-0">
                            <td className="px-3 py-2.5">
                              <p className="font-medium text-[#000435]">{item.product?.name ?? 'Product'}</p>
                              <p className="text-xs text-slate-500">{item.product?.sku}</p>
                            </td>
                            <td className="px-3 py-2.5 text-center font-semibold">{item.quantity}</td>
                            <td className="hidden px-3 py-2.5 text-center text-slate-500 sm:table-cell">
                              {item.batchNumber || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
