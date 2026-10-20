'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { inventoryApi } from '@/services/inventory-api';
import type { StockAdjustment, Product } from '@/types';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ExportDropdown } from '@/components/export-dropdown';
import type { ExportColumn } from '@/lib/export-utils';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';

export default function AdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [form, setForm] = useState({
    reason: 'DAMAGE', reasonDescription: '', notes: '',
    adjustmentDate: new Date().toISOString().split('T')[0],
    items: [] as { productId: string; expectedQty: number; actualQty: number; notes?: string }[],
  });

  const load = async () => {
    try {
      const [a, p] = await Promise.all([
        inventoryApi.adjustments.list(),
        inventoryApi.products.list({}),
      ]);
      setAdjustments(a);
      setProducts(p);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addItem = () => setForm({ ...form, items: [...form.items, { productId: '', expectedQty: 0, actualQty: 0 }] });
  const removeItem = (idx: number) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  const updateItem = (idx: number, field: string, value: any) => {
    const items = [...form.items];
    (items[idx] as any)[field] = value;
    setForm({ ...form, items });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inventoryApi.adjustments.create(form);
      toast.success('Stock adjustment created');
      setDialogOpen(false);
      setForm({
        reason: 'DAMAGE', reasonDescription: '', notes: '',
        adjustmentDate: new Date().toISOString().split('T')[0], items: [],
      });
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error creating adjustment');
    }
  };

  const reasonBadge = (reason: string) => {
    if (reason === 'DAMAGE') return <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Damage</span>;
    if (reason === 'LOSS') return <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">Loss</span>;
    if (reason === 'FOUND') return <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Found</span>;
    if (reason === 'CORRECTION') return <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Correction</span>;
    return <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{reason}</span>;
  };

  const exportColumns: ExportColumn[] = [
    { header: 'Adjustment #', accessor: 'adjustmentNumber' },
    { header: 'Reason', accessor: 'reason' },
    { header: 'Items', accessor: 'items' },
    { header: 'Date', accessor: 'date' },
    { header: 'Notes', accessor: 'notes' },
  ];

  const exportData = adjustments.map(adj => ({
    adjustmentNumber: adj.adjustmentNumber,
    reason: adj.reason,
    items: adj._count?.items ?? 0,
    date: new Date(adj.adjustmentDate).toLocaleDateString(),
    notes: adj.notes || '-',
  }));

  if (loading) return <MainLayout><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div></MainLayout>;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Stock Adjustments</h1>
            <p className="text-sm text-muted-foreground">Adjust stock levels for damage, loss, or corrections</p>
          </div>
          <div className="flex gap-2 pt-4 items-center justify-between sm:pt-0">
            <ExportDropdown title="Stock Adjustments" columns={exportColumns} data={exportData} />
            <button onClick={() => setDialogOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">
              <Plus className="h-4 w-4" /> New Adjustment
            </button>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setDialogOpen(false); } }}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>New Stock Adjustment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Reason *</label>
                  <select value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} required className="w-full rounded-lg border px-3 py-2 text-sm">
                    <option value="DAMAGE">Damage</option>
                    <option value="LOSS">Loss</option>
                    <option value="FOUND">Found / Surplus</option>
                    <option value="CORRECTION">System Correction</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reason Description</label>
                  <input value={form.reasonDescription} onChange={e => setForm({ ...form, reasonDescription: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Adjustment Date *</label>
                  <input type="date" value={form.adjustmentDate} onChange={e => setForm({ ...form, adjustmentDate: e.target.value })} required className="w-full rounded-lg border px-3 py-2 text-sm" />
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
                      <label className="block text-xs font-medium mb-1">Expected</label>
                      <input type="number" min="0" value={item.expectedQty} onChange={e => updateItem(idx, 'expectedQty', Number(e.target.value))} required className="w-full rounded-lg border px-2 py-1.5 text-sm" />
                    </div>
                    <div className="w-20">
                      <label className="block text-xs font-medium mb-1">Actual</label>
                      <input type="number" min="0" value={item.actualQty} onChange={e => updateItem(idx, 'actualQty', Number(e.target.value))} required className="w-full rounded-lg border px-2 py-1.5 text-sm" />
                    </div>
                    {item.expectedQty > 0 && (
                      <div className="text-xs font-medium px-2 py-1.5">
                        Diff: {item.actualQty - item.expectedQty}
                      </div>
                    )}
                    <button type="button" onClick={() => removeItem(idx)} className="rounded-lg p-2 text-red-600 hover:bg-red-50 text-sm">Remove</button>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <DialogClose render={<button type="button" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-all active:scale-95" />}>Cancel</DialogClose>
                <button type="submit" className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-all active:scale-95">Create Adjustment</button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <div className="rounded-xl border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium">Adjustment #</th>
                <th className="text-center px-4 py-3 font-medium">Reason</th>
                <th className="text-center px-4 py-3 font-medium">Items</th>
                <th className="text-center px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map(adj => (
                <tr key={adj.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{adj.adjustmentNumber}</td>
                  <td className="px-4 py-3 text-center">{reasonBadge(adj.reason)}</td>
                  <td className="px-4 py-3 text-center">{adj._count?.items ?? 0}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{new Date(adj.adjustmentDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{adj.notes || '-'}</td>
                </tr>
              ))}
              {adjustments.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No adjustments yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
