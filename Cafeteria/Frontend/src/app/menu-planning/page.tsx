'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { cafeteriaApi } from '@/services/cafeteria-api';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Calendar, X, Search } from 'lucide-react';
import type { MealPlan, MealPlanItem, MenuItem } from '@/types';

const MEAL_TYPES = ['BREAKFAST', 'MORNING_TEA', 'LUNCH', 'AFTERNOON_SNACK', 'DINNER'];
const PLAN_TYPES = ['DAILY', 'WEEKLY', 'MONTHLY', 'EVENT', 'HOLIDAY'];
const PLAN_STATUSES = ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

const initialForm = {
  planDate: new Date().toISOString().split('T')[0],
  mealType: 'LUNCH',
  planType: 'DAILY',
  notes: '',
  items: [] as { menuItemId: string; servingsPlanned: number }[],
};

export default function MenuPlanningPage() {
  const { ready, authorized } = useAuth();
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<MealPlan | null>(null);
  const [form, setForm] = useState(initialForm);
  const [filterMealType, setFilterMealType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const params: any = {};
      if (filterMealType) params.mealType = filterMealType;
      if (filterStatus) params.status = filterStatus;
      const [plansData, menuItemsData] = await Promise.all([
        cafeteriaApi.mealPlans.list(params),
        cafeteriaApi.menuItems.list(),
      ]);
      setPlans(plansData);
      setMenuItems(menuItemsData);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [filterMealType, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm(initialForm);
    setEditItem(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (plan: MealPlan) => {
    setForm({
      planDate: plan.planDate.split('T')[0],
      mealType: plan.mealType,
      planType: plan.planType,
      notes: plan.notes || '',
      items: plan.items?.map(i => ({ menuItemId: i.menuItemId, servingsPlanned: i.servingsPlanned })) || [],
    });
    setEditItem(plan);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editItem) {
        await cafeteriaApi.mealPlans.update(editItem.id, form);
        toast.success('Menu plan updated');
      } else {
        await cafeteriaApi.mealPlans.create(form);
        toast.success('Menu plan created');
      }
      setDialogOpen(false);
      resetForm();
      load();
    } catch {
      toast.error('Failed to save menu plan');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this menu plan?')) return;
    try {
      await cafeteriaApi.mealPlans.remove(id);
      toast.success('Menu plan deleted');
      load();
    } catch {
      toast.error('Failed to delete menu plan');
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await cafeteriaApi.mealPlans.activate(id);
      toast.success('Menu plan activated');
      load();
    } catch {
      toast.error('Failed to activate menu plan');
    }
  };

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { menuItemId: '', servingsPlanned: 0 }] });
  };

  const removeItem = (idx: number) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    setForm({ ...form, items });
  };

  const filteredPlans = plans.filter(p => {
    if (search && !p.planDate.includes(search) && !p.mealType.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700',
      ACTIVE: 'bg-green-100 text-green-700',
      COMPLETED: 'bg-amber-100 text-amber-700',
      CANCELLED: 'bg-red-100 text-red-700',
    };
    return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>;
  };

  if (!ready || loading) {
    return <MainLayout><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div></MainLayout>;
  }

  if (!authorized) {
    return <MainLayout><div className="flex items-center justify-center h-64"><p className="text-red-600">Access Denied</p></div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Menu Planning</h1>
            <p className="text-sm text-muted-foreground">Create and manage daily, weekly, and monthly menus</p>
          </div>
          <button onClick={openCreate} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Create Menu Plan
          </button>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search plans..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <select
            value={filterMealType}
            onChange={(e) => setFilterMealType(e.target.value)}
            className="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="">All Meal Types</option>
            {MEAL_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="">All Statuses</option>
            {PLAN_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {dialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{editItem ? 'Edit Menu Plan' : 'Create Menu Plan'}</h2>
                <button onClick={() => { setDialogOpen(false); resetForm(); }} className="rounded-lg p-1 hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Plan Date</label>
                  <input type="date" value={form.planDate} onChange={(e) => setForm({ ...form, planDate: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Meal Type</label>
                  <select value={form.mealType} onChange={(e) => setForm({ ...form, mealType: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    {MEAL_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Plan Type</label>
                  <select value={form.planType} onChange={(e) => setForm({ ...form, planType: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    {PLAN_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Optional notes" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">Menu Items</label>
                  <button onClick={addItem} className="text-sm text-amber-600 hover:text-amber-700 flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Add Item
                  </button>
                </div>
                {form.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No items added yet</p>
                ) : (
                  <div className="space-y-2">
                    {form.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={item.menuItemId}
                          onChange={(e) => updateItem(idx, 'menuItemId', e.target.value)}
                          className="flex-1 rounded-lg border px-3 py-2 text-sm"
                        >
                          <option value="">Select menu item</option>
                          {menuItems.map(mi => (
                            <option key={mi.id} value={mi.id}>{mi.name} ({mi.category})</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          placeholder="Servings"
                          value={item.servingsPlanned || ''}
                          onChange={(e) => updateItem(idx, 'servingsPlanned', parseInt(e.target.value) || 0)}
                          className="w-24 rounded-lg border px-3 py-2 text-sm"
                        />
                        <button onClick={() => removeItem(idx)} className="rounded-lg p-2 text-red-500 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => { setDialogOpen(false); resetForm(); }} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">{editItem ? 'Update' : 'Create'}</button>
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
                <th className="text-left px-4 py-3 font-medium">Plan Type</th>
                <th className="text-left px-4 py-3 font-medium">Items</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlans.map((plan) => (
                <tr key={plan.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{new Date(plan.planDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{plan.mealType.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">{plan.planType.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">{plan._count?.items || 0} items</td>
                  <td className="px-4 py-3">{statusBadge(plan.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {plan.status === 'DRAFT' && (
                        <button onClick={() => handleActivate(plan.id)} className="rounded-lg p-1.5 text-green-600 hover:bg-green-50" title="Activate">
                          <Calendar className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => openEdit(plan)} className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(plan.id)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPlans.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No menu plans found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
