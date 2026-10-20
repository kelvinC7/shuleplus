'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { cafeteriaApi } from '@/services/cafeteria-api';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Search, Truck, Star } from 'lucide-react';
import type { SupplierDelivery } from '@/types';

const DELIVERY_STATUSES = ['SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'REJECTED'];

const initialForm = {
  supplierId: '',
  deliveryDate: new Date().toISOString().split('T')[0],
  invoiceNumber: '',
  deliveryNoteNumber: '',
  receivedBy: '',
  inspectionNotes: '',
  items: [] as { productId: string; quantity: number; unitCost: number; qualityStatus: string; notes: string }[],
};

export default function SuppliersPage() {
  const [deliveries, setDeliveries] = useState<SupplierDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const params: any = {};
      if (filterStatus) params.status = filterStatus;
      const data = await cafeteriaApi.supplierDeliveries.list(params);
      setDeliveries(data);
    } catch {
      toast.error('Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    try {
      await cafeteriaApi.supplierDeliveries.create(form);
      toast.success('Delivery recorded');
      setDialogOpen(false);
      setForm(initialForm);
      load();
    } catch {
      toast.error('Failed to record delivery');
    }
  };

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { productId: '', quantity: 0, unitCost: 0, qualityStatus: 'ACCEPTED', notes: '' }] });
  };

  const removeItem = (idx: number) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    setForm({ ...form, items });
  };

  const filteredDeliveries = deliveries.filter(d => {
    if (search && !d.supplier?.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      SCHEDULED: 'bg-gray-100 text-gray-700',
      IN_TRANSIT: 'bg-yellow-100 text-yellow-700',
      DELIVERED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-700',
    };
    return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>{status.replace(/_/g, ' ')}</span>;
  };

  if (loading) {
    return <MainLayout><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Supplier Deliveries</h1>
            <p className="text-sm text-muted-foreground">Track incoming food deliveries and quality inspections</p>
          </div>
          <button onClick={() => { setForm(initialForm); setDialogOpen(true); }} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Record Delivery
          </button>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Search deliveries..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div className="flex gap-1">
            <button onClick={() => setFilterStatus('')} className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${!filterStatus ? 'bg-primary text-white' : 'bg-white border hover:bg-gray-50'}`}>All</button>
            {DELIVERY_STATUSES.map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${filterStatus === s ? 'bg-primary text-white' : 'bg-white border hover:bg-gray-50'}`}>{s.replace(/_/g, ' ')}</button>
            ))}
          </div>
        </div>

        {dialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Record Delivery</h2>
                <button onClick={() => setDialogOpen(false)} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Supplier ID</label>
                  <input value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Delivery Date</label>
                  <input type="date" value={form.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Invoice Number</label>
                  <input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Delivery Note</label>
                  <input value={form.deliveryNoteNumber} onChange={(e) => setForm({ ...form, deliveryNoteNumber: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Received By</label>
                  <input value={form.receivedBy} onChange={(e) => setForm({ ...form, receivedBy: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Inspection Notes</label>
                  <input value={form.inspectionNotes} onChange={(e) => setForm({ ...form, inspectionNotes: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">Items</label>
                  <button onClick={addItem} className="text-sm text-amber-600 hover:text-amber-700 flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Add Item
                  </button>
                </div>
                {form.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items added</p>
                ) : (
                  <div className="space-y-2">
                    {form.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input placeholder="Product ID" value={item.productId} onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                          className="flex-1 rounded-lg border px-3 py-2 text-sm" />
                        <input type="number" placeholder="Qty" value={item.quantity || ''} onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-20 rounded-lg border px-3 py-2 text-sm" />
                        <input type="number" step="0.01" placeholder="Cost" value={item.unitCost || ''} onChange={(e) => updateItem(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                          className="w-24 rounded-lg border px-3 py-2 text-sm" />
                        <select value={item.qualityStatus} onChange={(e) => updateItem(idx, 'qualityStatus', e.target.value)}
                          className="w-28 rounded-lg border px-3 py-2 text-sm">
                          <option value="ACCEPTED">Accepted</option>
                          <option value="REJECTED">Rejected</option>
                          <option value="PARTIAL">Partial</option>
                        </select>
                        <button onClick={() => removeItem(idx)} className="rounded-lg p-2 text-red-500 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setDialogOpen(false)} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">Record</button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Supplier</th>
                <th className="text-left px-4 py-3 font-medium">Invoice</th>
                <th className="text-left px-4 py-3 font-medium">Items</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Quality</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeliveries.map((d) => (
                <tr key={d.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{new Date(d.deliveryDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-medium">{d.supplier?.name || 'Unknown'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.invoiceNumber || '-'}</td>
                  <td className="px-4 py-3">{d._count?.items || 0}</td>
                  <td className="px-4 py-3">{statusBadge(d.status)}</td>
                  <td className="px-4 py-3">
                    {d.qualityRating ? (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span>{d.qualityRating}</span>
                      </div>
                    ) : '-'}
                  </td>
                </tr>
              ))}
              {filteredDeliveries.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No deliveries found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}


