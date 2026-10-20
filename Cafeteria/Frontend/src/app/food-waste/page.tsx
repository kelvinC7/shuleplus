'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { cafeteriaApi } from '@/services/cafeteria-api';
import { toast } from 'sonner';
import { Plus, X, Search, Trash2 } from 'lucide-react';
import type { FoodWaste } from '@/types';

const WASTE_TYPES = ['SPOILED', 'LEFTOVERS', 'EXPIRED', 'COOKING_WASTE', 'OVERPRODUCED'];

const initialForm = {
  productionId: '',
  wasteDate: new Date().toISOString().split('T')[0],
  wasteType: 'LEFTOVERS',
  itemName: '',
  quantity: 0,
  unit: 'kg',
  cost: 0,
  reason: '',
};

export default function FoodWastePage() {
  const [waste, setWaste] = useState<FoodWaste[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const params: any = {};
      if (filterType) params.wasteType = filterType;
      const data = await cafeteriaApi.foodWaste.list(params);
      setWaste(data);
    } catch {
      toast.error('Failed to load waste data');
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    try {
      await cafeteriaApi.foodWaste.create(form);
      toast.success('Waste recorded');
      setDialogOpen(false);
      setForm(initialForm);
      load();
    } catch {
      toast.error('Failed to record waste');
    }
  };

  const filteredWaste = waste.filter(w => {
    if (search && !w.itemName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalWaste = filteredWaste.reduce((sum, w) => sum + w.quantity, 0);
  const totalCost = filteredWaste.reduce((sum, w) => sum + (w.cost || 0), 0);

  const wasteByType = WASTE_TYPES.map(type => ({
    type,
    count: filteredWaste.filter(w => w.wasteType === type).length,
    total: filteredWaste.filter(w => w.wasteType === type).reduce((sum, w) => sum + w.quantity, 0),
  }));

  if (loading) {
    return <MainLayout><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Food Waste Management</h1>
            <p className="text-sm text-muted-foreground">Track spoiled food, leftovers, expired items, and cooking waste</p>
          </div>
          <button onClick={() => { setForm(initialForm); setDialogOpen(true); }} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Record Waste
          </button>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-white p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-red-600">{totalWaste.toFixed(1)} kg</p>
            <p className="text-xs text-muted-foreground">Total Waste</p>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-orange-600">${totalCost.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Total Cost</p>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm text-center">
            <p className="text-2xl font-bold">{filteredWaste.length}</p>
            <p className="text-xs text-muted-foreground">Waste Records</p>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm text-center">
            <p className="text-2xl font-bold">{WASTE_TYPES.length}</p>
            <p className="text-xs text-muted-foreground">Waste Categories</p>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          {wasteByType.map((w) => (
            <div key={w.type} className="rounded-xl border bg-white p-3 shadow-sm text-center">
              <p className="text-lg font-bold">{w.total.toFixed(1)} kg</p>
              <p className="text-xs text-muted-foreground">{w.type.replace(/_/g, ' ')}</p>
              <p className="text-xs text-muted-foreground">{w.count} records</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Search waste records..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div className="flex gap-1">
            <button onClick={() => setFilterType('')} className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${!filterType ? 'bg-primary text-white' : 'bg-white border hover:bg-gray-50'}`}>All</button>
            {WASTE_TYPES.map(t => (
              <button key={t} onClick={() => setFilterType(t)} className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${filterType === t ? 'bg-primary text-white' : 'bg-white border hover:bg-gray-50'}`}>{t.replace(/_/g, ' ')}</button>
            ))}
          </div>
        </div>

        {dialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Record Food Waste</h2>
                <button onClick={() => setDialogOpen(false)} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input type="date" value={form.wasteDate} onChange={(e) => setForm({ ...form, wasteDate: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Waste Type</label>
                  <select value={form.wasteType} onChange={(e) => setForm({ ...form, wasteType: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm">
                    {WASTE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Item Name</label>
                  <input value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="e.g., Rice, Beans, Vegetables" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity</label>
                  <input type="number" step="0.1" value={form.quantity || ''} onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit</label>
                  <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm">
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="pcs">pcs</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cost ($)</label>
                  <input type="number" step="0.01" value={form.cost || ''} onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Reason</label>
                  <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Why was this wasted?" />
                </div>
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
                <th className="text-left px-4 py-3 font-medium">Item</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Quantity</th>
                <th className="text-left px-4 py-3 font-medium">Cost</th>
                <th className="text-left px-4 py-3 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              {filteredWaste.map((w) => (
                <tr key={w.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{new Date(w.wasteDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-medium">{w.itemName}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{w.wasteType.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-4 py-3">{w.quantity} {w.unit}</td>
                  <td className="px-4 py-3">${(w.cost || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{w.reason || '-'}</td>
                </tr>
              ))}
              {filteredWaste.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No waste records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
