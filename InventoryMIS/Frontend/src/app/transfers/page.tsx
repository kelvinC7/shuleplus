'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { inventoryApi } from '@/services/inventory-api';
import type { StockTransfer, Store, Product } from '@/types';
import { Plus, CheckCircle, XCircle, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';
import { ExportDropdown } from '@/components/export-dropdown';
import type { ExportColumn } from '@/lib/export-utils';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [form, setForm] = useState({
    fromStoreId: '', toStoreId: '', notes: '',
    items: [] as { productId: string; quantity: number }[],
  });

  const load = async () => {
    try {
      const [t, s, p] = await Promise.all([
        inventoryApi.transfers.list(),
        inventoryApi.stores.list(),
        inventoryApi.products.list({}),
      ]);
      setTransfers(t);
      setStores(s);
      setProducts(p);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addItem = () => setForm({ ...form, items: [...form.items, { productId: '', quantity: 1 }] });
  const removeItem = (idx: number) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  const updateItem = (idx: number, field: string, value: any) => {
    const items = [...form.items];
    (items[idx] as any)[field] = value;
    setForm({ ...form, items });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inventoryApi.transfers.create(form);
      toast.success('Stock transfer created');
      setDialogOpen(false);
      setForm({ fromStoreId: '', toStoreId: '', notes: '', items: [] });
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error creating transfer');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await inventoryApi.transfers.approve(id);
      toast.success('Transfer approved');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error approving transfer');
    }
  };

  const handleReceive = async (id: string) => {
    try {
      await inventoryApi.transfers.receive(id);
      toast.success('Transfer received');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error receiving transfer');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await inventoryApi.transfers.reject(id);
      toast.success('Transfer rejected');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error rejecting transfer');
    }
  };

  const statusBadge = (status: string) => {
    if (status === 'APPROVED') return <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Approved</span>;
    if (status === 'REJECTED') return <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Rejected</span>;
    if (status === 'RECEIVED') return <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Received</span>;
    return <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Pending</span>;
  };

  const exportColumns: ExportColumn[] = [
    { header: 'Transfer #', accessor: 'transferNumber' },
    { header: 'From', accessor: 'from' },
    { header: 'To', accessor: 'to' },
    { header: 'Status', accessor: 'status' },
    { header: 'Items', accessor: 'items' },
    { header: 'Date', accessor: 'date' },
  ];

  const exportData = transfers.map(t => ({
    transferNumber: t.transferNumber,
    from: t.fromStore?.name || '-',
    to: t.toStore?.name || '-',
    status: t.status,
    items: t._count?.items ?? 0,
    date: new Date(t.createdAt).toLocaleDateString(),
  }));

  if (loading) return <MainLayout><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div></MainLayout>;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Stock Transfers</h1>
            <p className="text-sm text-muted-foreground">Transfer stock between stores</p>
          </div>
          <div className="flex gap-2 pt-4 items-center justify-between sm:pt-0">
            <ExportDropdown title="Stock Transfers" columns={exportColumns} data={exportData} />
            <button onClick={() => setDialogOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">
              <Plus className="h-4 w-4" /> New Transfer
            </button>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setDialogOpen(false); } }}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>New Stock Transfer</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">From Store *</label>
                  <SearchableSelect
                    value={form.fromStoreId}
                    onChange={v => setForm({ ...form, fromStoreId: v })}
                    options={stores.filter(s => s.id !== form.toStoreId).map(s => ({ value: s.id, label: s.name }))}
                    placeholder="Select source store"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">To Store *</label>
                  <SearchableSelect
                    value={form.toStoreId}
                    onChange={v => setForm({ ...form, toStoreId: v })}
                    options={stores.filter(s => s.id !== form.fromStoreId).map(s => ({ value: s.id, label: s.name }))}
                    placeholder="Select destination store"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" rows={2} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Items</h4>
                  <button type="button" onClick={addItem} className="text-sm text-amber-600 hover:underline">+ Add Item</button>
                </div>
                {form.items.map((item, idx) => (
                  <div key={idx} className="flex flex-wrap gap-2 items-end border rounded-lg p-3 bg-gray-50">
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-xs font-medium mb-1">Product</label>
                      <SearchableSelect
                        value={item.productId}
                        onChange={v => updateItem(idx, 'productId', v)}
                        options={products.map(p => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
                        placeholder="Select product"
                      />
                    </div>
                    <div className="w-20">
                      <label className="block text-xs font-medium mb-1">Qty</label>
                      <input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} required className="w-full rounded-lg border px-2 py-1.5 text-sm" />
                    </div>
                    <button type="button" onClick={() => removeItem(idx)} className="rounded-lg p-2 text-red-600 hover:bg-red-50 text-sm">Remove</button>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <DialogClose render={<button type="button" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-all active:scale-95" />}>Cancel</DialogClose>
                <button type="submit" className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-all active:scale-95">Create Transfer</button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <div className="rounded-xl border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium">Transfer #</th>
                <th className="text-left px-4 py-3 font-medium">From</th>
                <th className="text-left px-4 py-3 font-medium">To</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-center px-4 py-3 font-medium">Items</th>
                <th className="text-center px-4 py-3 font-medium">Date</th>
                <th className="text-center px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map(t => (
                <tr key={t.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{t.transferNumber}</td>
                  <td className="px-4 py-3">{t.fromStore?.name || '-'}</td>
                  <td className="px-4 py-3">{t.toStore?.name || '-'}</td>
                  <td className="px-4 py-3 text-center">{statusBadge(t.status)}</td>
                  <td className="px-4 py-3 text-center">{t._count?.items ?? 0}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {t.status === 'PENDING' && (
                        <>
                          <button onClick={() => handleApprove(t.id)} className="rounded-lg p-1.5 hover:bg-green-50 text-green-600" title="Approve"><CheckCircle className="h-4 w-4" /></button>
                          <button onClick={() => handleReject(t.id)} className="rounded-lg p-1.5 hover:bg-red-50 text-red-600" title="Reject"><XCircle className="h-4 w-4" /></button>
                        </>
                      )}
                      {t.status === 'APPROVED' && (
                        <button onClick={() => handleReceive(t.id)} className="rounded-lg p-1.5 hover:bg-amber-50 text-amber-600" title="Receive"><ArrowRightLeft className="h-4 w-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {transfers.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No transfers yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
