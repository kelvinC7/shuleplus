'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { cafeteriaApi } from '@/services/cafeteria-api';
import { toast } from 'sonner';
import { Plus, X, Search, ChefHat, CheckCircle, XCircle } from 'lucide-react';
import type { MealProduction, MealPlan } from '@/types';

const MEAL_TYPES = ['BREAKFAST', 'MORNING_TEA', 'LUNCH', 'AFTERNOON_SNACK', 'DINNER'];
const PRODUCTION_STATUSES = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const initialForm = {
  mealPlanId: '',
  productionDate: new Date().toISOString().split('T')[0],
  mealType: 'LUNCH',
  plannedServings: 0,
  actualServings: 0,
  notes: '',
};

export default function MealProductionPage() {
  const [productions, setProductions] = useState<MealProduction[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [filterMealType, setFilterMealType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const params: any = {};
      if (filterMealType) params.mealType = filterMealType;
      if (filterStatus) params.status = filterStatus;
      const [prodData, planData] = await Promise.all([
        cafeteriaApi.mealProductions.list(params),
        cafeteriaApi.mealPlans.list(),
      ]);
      setProductions(prodData);
      setMealPlans(planData);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [filterMealType, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    try {
      await cafeteriaApi.mealProductions.create(form);
      toast.success('Production record created');
      setDialogOpen(false);
      setForm(initialForm);
      load();
    } catch {
      toast.error('Failed to create production record');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await cafeteriaApi.mealProductions.complete(id);
      toast.success('Production marked as complete');
      load();
    } catch {
      toast.error('Failed to complete production');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this production?')) return;
    try {
      await cafeteriaApi.mealProductions.cancel(id);
      toast.success('Production cancelled');
      load();
    } catch {
      toast.error('Failed to cancel production');
    }
  };

  const filteredProductions = productions.filter(p => {
    if (search && !p.mealType.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PLANNED: 'bg-gray-100 text-gray-700',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
      COMPLETED: 'bg-green-100 text-green-700',
      CANCELLED: 'bg-red-100 text-red-700',
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
            <h1 className="text-2xl font-bold">Meal Production</h1>
            <p className="text-sm text-muted-foreground">Track meals prepared, served, and remaining</p>
          </div>
          <button onClick={() => { setForm(initialForm); setDialogOpen(true); }} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Record Production
          </button>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Search productions..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <select value={filterMealType} onChange={(e) => setFilterMealType(e.target.value)}
            className="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-primary">
            <option value="">All Meal Types</option>
            {MEAL_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-primary">
            <option value="">All Statuses</option>
            {PRODUCTION_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>

        {dialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Record Production</h2>
                <button onClick={() => setDialogOpen(false)} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Production Date</label>
                  <input type="date" value={form.productionDate} onChange={(e) => setForm({ ...form, productionDate: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Meal Type</label>
                  <select value={form.mealType} onChange={(e) => setForm({ ...form, mealType: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm">
                    {MEAL_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Meal Plan (optional)</label>
                  <select value={form.mealPlanId} onChange={(e) => setForm({ ...form, mealPlanId: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm">
                    <option value="">No linked plan</option>
                    {mealPlans.map(p => (
                      <option key={p.id} value={p.id}>{p.planDate} - {p.mealType.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Planned Servings</label>
                  <input type="number" value={form.plannedServings || ''} onChange={(e) => setForm({ ...form, plannedServings: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Actual Servings</label>
                  <input type="number" value={form.actualServings || ''} onChange={(e) => setForm({ ...form, actualServings: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Optional notes" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setDialogOpen(false)} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">Create</button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Meal Type</th>
                <th className="text-left px-4 py-3 font-medium">Planned</th>
                <th className="text-left px-4 py-3 font-medium">Actual</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProductions.map((prod) => (
                <tr key={prod.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{new Date(prod.productionDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{prod.mealType.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">{prod.plannedServings}</td>
                  <td className="px-4 py-3">{prod.actualServings}</td>
                  <td className="px-4 py-3">{statusBadge(prod.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {prod.status === 'IN_PROGRESS' && (
                        <button onClick={() => handleComplete(prod.id)} className="rounded-lg p-1.5 text-green-600 hover:bg-green-50" title="Complete">
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      {(prod.status === 'PLANNED' || prod.status === 'IN_PROGRESS') && (
                        <button onClick={() => handleCancel(prod.id)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" title="Cancel">
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProductions.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No production records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
