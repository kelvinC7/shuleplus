'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { inventoryApi } from '@/services/inventory-api';
import type { PhysicalStockCount, Product } from '@/types';
import { Plus, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { ExportDropdown } from '@/components/export-dropdown';
import type { ExportColumn } from '@/lib/export-utils';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';

export default function PhysicalCountsPage() {
  const [counts, setCounts] = useState<PhysicalStockCount[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [form, setForm] = useState({
    countType: 'FULL', notes: '',
    countDate: new Date().toISOString().split('T')[0],
    items: [] as { productId: string; actualQty: number; notes?: string }[],
  });

  const load = async () => {
    try {
      const [c, p] = await Promise.all([
        inventoryApi.physicalCounts.list(),
        inventoryApi.products.list({}),
      ]);
      setCounts(c);
      setProducts(p);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addItem = () => setForm({ ...form, items: [...form.items, { productId: '', actualQty: 0 }] });
  const removeItem = (idx: number) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  const updateItem = (idx: number, field: string, value: any) => {
    const items = [...form.items];
    (items[idx] as any)[field] = value;
    setForm({ ...form, items });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inventoryApi.physicalCounts.create(form);
      toast.success('Physical count recorded');
      setDialogOpen(false);
      setForm({
        countType: 'FULL', notes: '',
        countDate: new Date().toISOString().split('T')[0], items: [],
      });
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error creating count');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await inventoryApi.physicalCounts.complete(id);
      toast.success('Count completed');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error completing count');
    }
  };

  const statusBadge = (status: string) => {
    if (status === 'COMPLETED') return <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Completed</span>;
    if (status === 'VERIFIED') return <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Verified</span>;
    return <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Draft</span>;
  };

  const exportColumns: ExportColumn[] = [
    { header: 'Count #', accessor: 'countNumber' },
    { header: 'Type', accessor: 'type' },
    { header: 'Status', accessor: 'status' },
    { header: 'Items', accessor: 'items' },
    { header: 'Date', accessor: 'date' },
  ];

  const exportData = counts.map(c => ({
    countNumber: c.countNumber,
    type: c.countType,
    status: c.status,
    items: c._count?.items ?? 0,
    date: new Date(c.countDate).toLocaleDateString(),
  }));

  if (loading) return <MainLayout><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div></MainLayout>;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Physical Stock Counts</h1>
            <p className="text-sm text-muted-foreground">Conduct and manage physical inventory counts</p>
          </div>
          <div className="flex gap-2 pt-4 items-center justify-between sm:pt-0">
            <ExportDropdown title="Physical Stock Counts" columns={exportColumns} data={exportData} />
            <button onClick={() => setDialogOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">
              <Plus className="h-4 w-4" /> New Count
            </button>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setDialogOpen(false); } }}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>New Physical Count</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Count Type *</label>
                  <select value={form.countType} onChange={e => setForm({ ...form, countType: e.target.value })} required className="w-full rounded-lg border px-3 py-2 text-sm">
                    <option value="FULL">Full Count</option>
                    <option value="PARTIAL">Partial Count</option>
                    <option value="CYCLE">Cycle Count</option>
                    <option value="SPOT">Spot Check</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Count Date *</label>
                  <input type="date" value={form.countDate} onChange={e => setForm({ ...form, countDate: e.target.value })} required className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Items to Count</h4>
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
                      <label className="block text-xs font-medium mb-1">Actual Qty</label>
                      <input type="number" min="0" value={item.actualQty} onChange={e => updateItem(idx, 'actualQty', Number(e.target.value))} required className="w-full rounded-lg border px-2 py-1.5 text-sm" />
                    </div>
                    <button type="button" onClick={() => removeItem(idx)} className="rounded-lg p-2 text-red-600 hover:bg-red-50 text-sm">Remove</button>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <DialogClose render={<button type="button" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-all active:scale-95" />}>Cancel</DialogClose>
                <button type="submit" className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-all active:scale-95">Save Count</button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <div className="rounded-xl border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium">Count #</th>
                <th className="text-center px-4 py-3 font-medium">Type</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-center px-4 py-3 font-medium">Items</th>
                <th className="text-center px-4 py-3 font-medium">Date</th>
                <th className="text-center px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {counts.map(c => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.countNumber}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{c.countType}</span>
                  </td>
                  <td className="px-4 py-3 text-center">{statusBadge(c.status)}</td>
                  <td className="px-4 py-3 text-center">{c._count?.items ?? 0}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{new Date(c.countDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center">
                    {c.status === 'DRAFT' && (
                      <button onClick={() => handleComplete(c.id)} className="rounded-lg p-1.5 hover:bg-amber-50 text-amber-600" title="Complete">
                        <ClipboardCheck className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {counts.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No counts recorded yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
