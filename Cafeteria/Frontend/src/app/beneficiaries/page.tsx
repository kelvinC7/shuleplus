'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { cafeteriaApi } from '@/services/cafeteria-api';
import { toast } from 'sonner';
import { Plus, X, Search, Users, UserCheck } from 'lucide-react';
import type { MealServing } from '@/types';

const BENEFICIARY_TYPES = ['STUDENT', 'TEACHER', 'EMPLOYEE', 'VISITOR', 'GUEST', 'CONTRACTOR'];

export default function BeneficiariesPage() {
  const [servings, setServings] = useState<MealServing[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    productionId: '',
    beneficiaryType: 'STUDENT',
    beneficiaryId: '',
    beneficiaryName: '',
    quantity: 1,
    notes: '',
  });
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const params: any = {};
      if (filterType) params.beneficiaryType = filterType;
      const data = await cafeteriaApi.mealServings.list(params);
      setServings(data);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    try {
      await cafeteriaApi.mealServings.create(form);
      toast.success('Serving recorded');
      setDialogOpen(false);
      setForm({ productionId: '', beneficiaryType: 'STUDENT', beneficiaryId: '', beneficiaryName: '', quantity: 1, notes: '' });
      load();
    } catch {
      toast.error('Failed to record serving');
    }
  };

  const filteredServings = servings.filter(s => {
    if (search && !s.beneficiaryName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const summary = BENEFICIARY_TYPES.map(type => ({
    type,
    count: servings.filter(s => s.beneficiaryType === type).length,
    totalQuantity: servings.filter(s => s.beneficiaryType === type).reduce((sum, s) => sum + s.quantity, 0),
  }));

  if (loading) {
    return <MainLayout><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Beneficiaries</h1>
            <p className="text-sm text-muted-foreground">Track meals served to students, teachers, employees, and visitors</p>
          </div>
          <button onClick={() => setDialogOpen(true)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Record Serving
          </button>
        </div>

        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {summary.map((s) => (
            <div key={s.type} className="rounded-xl border bg-white p-4 shadow-sm text-center">
              <p className="text-2xl font-bold">{s.totalQuantity}</p>
              <p className="text-xs text-muted-foreground uppercase">{s.type}</p>
              <p className="text-xs text-muted-foreground">{s.count} records</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-primary">
            <option value="">All Types</option>
            {BENEFICIARY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {dialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Record Serving</h2>
                <button onClick={() => setDialogOpen(false)} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Beneficiary Type</label>
                  <select value={form.beneficiaryType} onChange={(e) => setForm({ ...form, beneficiaryType: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm">
                    {BENEFICIARY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Beneficiary Name</label>
                  <input value={form.beneficiaryName} onChange={(e) => setForm({ ...form, beneficiaryName: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="e.g., John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Beneficiary ID (optional)</label>
                  <input value={form.beneficiaryId} onChange={(e) => setForm({ ...form, beneficiaryId: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="e.g., STU001" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity</label>
                  <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" min={1} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Optional notes" />
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
                <th className="text-left px-4 py-3 font-medium">Beneficiary</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">ID</th>
                <th className="text-left px-4 py-3 font-medium">Quantity</th>
                <th className="text-left px-4 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredServings.map((serving) => (
                <tr key={serving.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{new Date(serving.servedAt).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium">{serving.beneficiaryName}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      serving.beneficiaryType === 'STUDENT' ? 'bg-amber-100 text-amber-700' :
                      serving.beneficiaryType === 'TEACHER' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{serving.beneficiaryType}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{serving.beneficiaryId || '-'}</td>
                  <td className="px-4 py-3">{serving.quantity}</td>
                  <td className="px-4 py-3 text-muted-foreground">{serving.notes || '-'}</td>
                </tr>
              ))}
              {filteredServings.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No serving records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
