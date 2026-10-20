'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { cafeteriaApi } from '@/services/cafeteria-api';
import { toast } from 'sonner';
import { Plus, Pencil, X, Trash2, Heart, AlertTriangle } from 'lucide-react';
import type { AllergyProfile } from '@/types';

const ALLERGY_TYPES = ['PEANUT_ALLERGY', 'LACTOSE_INTOLERANCE', 'GLUTEN_FREE', 'VEGETARIAN', 'VEGAN', 'HALAL', 'DIABETIC_MEALS', 'NUT_ALLERGY', 'SEAFOOD_ALLERGY', 'EGG_ALLERGY'];
const BENEFICIARY_TYPES = ['STUDENT', 'TEACHER', 'EMPLOYEE', 'VISITOR', 'GUEST', 'CONTRACTOR'];
const SEVERITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const initialAllergyForm = {
  beneficiaryType: 'STUDENT',
  beneficiaryId: '',
  beneficiaryName: '',
  allergyType: 'PEANUT_ALLERGY',
  severity: 'MEDIUM',
  notes: '',
};

export default function NutritionPage() {
  const [allergies, setAllergies] = useState<AllergyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initialAllergyForm);
  const [editItem, setEditItem] = useState<AllergyProfile | null>(null);
  const [filterType, setFilterType] = useState('');
  const [activeTab, setActiveTab] = useState<'allergies' | 'nutrition'>('allergies');

  const load = useCallback(async () => {
    try {
      const params: any = {};
      if (filterType) params.beneficiaryType = filterType;
      const data = await cafeteriaApi.allergies.list(params);
      setAllergies(data);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setForm(initialAllergyForm); setEditItem(null); };

  const handleSave = async () => {
    try {
      if (editItem) {
        await cafeteriaApi.allergies.update(editItem.id, form);
        toast.success('Allergy profile updated');
      } else {
        await cafeteriaApi.allergies.create(form);
        toast.success('Allergy profile created');
      }
      setDialogOpen(false);
      resetForm();
      load();
    } catch {
      toast.error('Failed to save allergy profile');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this allergy profile?')) return;
    try {
      await cafeteriaApi.allergies.remove(id);
      toast.success('Allergy profile deleted');
      load();
    } catch {
      toast.error('Failed to delete allergy profile');
    }
  };

  const openEdit = (profile: AllergyProfile) => {
    setForm({
      beneficiaryType: profile.beneficiaryType,
      beneficiaryId: profile.beneficiaryId || '',
      beneficiaryName: profile.beneficiaryName,
      allergyType: profile.allergyType,
      severity: profile.severity,
      notes: profile.notes || '',
    });
    setEditItem(profile);
    setDialogOpen(true);
  };

  const filteredAllergies = allergies.filter(a => {
    if (filterType && a.beneficiaryType !== filterType) return false;
    return true;
  });

  const severityBadge = (severity: string) => {
    const styles: Record<string, string> = {
      LOW: 'bg-green-100 text-green-700',
      MEDIUM: 'bg-yellow-100 text-yellow-700',
      HIGH: 'bg-orange-100 text-orange-700',
      CRITICAL: 'bg-red-100 text-red-700',
    };
    return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[severity] || 'bg-gray-100 text-gray-700'}`}>{severity}</span>;
  };

  if (loading) {
    return <MainLayout><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Nutrition & Allergies</h1>
            <p className="text-sm text-muted-foreground">Manage dietary restrictions and nutrition information</p>
          </div>
          <button onClick={() => { resetForm(); setDialogOpen(true); }} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Dietary Profile
          </button>
        </div>

        <div className="flex gap-1">
          <button onClick={() => setActiveTab('allergies')} className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === 'allergies' ? 'bg-primary text-white' : 'bg-white border hover:bg-gray-50'}`}>Dietary Restrictions</button>
          <button onClick={() => setActiveTab('nutrition')} className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === 'nutrition' ? 'bg-primary text-white' : 'bg-white border hover:bg-gray-50'}`}>Nutrition Guide</button>
        </div>

        {activeTab === 'allergies' && (
          <>
            <div className="flex gap-1">
              <button onClick={() => setFilterType('')} className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${!filterType ? 'bg-primary text-white' : 'bg-white border hover:bg-gray-50'}`}>All</button>
              {BENEFICIARY_TYPES.map(t => (
                <button key={t} onClick={() => setFilterType(t)} className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${filterType === t ? 'bg-primary text-white' : 'bg-white border hover:bg-gray-50'}`}>{t}</button>
              ))}
            </div>

            <div className="rounded-xl border bg-white overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium">Beneficiary</th>
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium">Restriction</th>
                    <th className="text-left px-4 py-3 font-medium">Severity</th>
                    <th className="text-left px-4 py-3 font-medium">Notes</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAllergies.map((a) => (
                    <tr key={a.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{a.beneficiaryName}</td>
                      <td className="px-4 py-3">{a.beneficiaryType}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">{a.allergyType.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="px-4 py-3">{severityBadge(a.severity)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.notes || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(a)} className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(a.id)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredAllergies.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No dietary profiles found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'nutrition' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ALLERGY_TYPES.map((type) => (
              <div key={type} className="rounded-xl border bg-white p-5 shadow-sm">
                <h3 className="font-semibold capitalize">{type.replace(/_/g, ' ').toLowerCase()}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {type === 'PEANUT_ALLERGY' && 'Strictly no peanuts or peanut-derived products. Risk of anaphylaxis.'}
                  {type === 'LACTOSE_INTOLERANCE' && 'No dairy milk. Provide lactose-free alternatives.'}
                  {type === 'GLUTEN_FREE' && 'No wheat, barley, rye. Use gluten-free grains.'}
                  {type === 'VEGETARIAN' && 'No meat or fish. Dairy and eggs allowed.'}
                  {type === 'VEGAN' && 'No animal products whatsoever.'}
                  {type === 'HALAL' && 'Only halal-certified meat and ingredients.'}
                  {type === 'DIABETIC_MEALS' && 'Low sugar, controlled carbohydrates. Balanced meals.'}
                  {type === 'NUT_ALLERGY' && 'No tree nuts or nut-derived products.'}
                  {type === 'SEAFOOD_ALLERGY' && 'No fish or shellfish.'}
                  {type === 'EGG_ALLERGY' && 'No eggs or egg-derived products in cooking.'}
                </p>
              </div>
            ))}
          </div>
        )}

        {dialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{editItem ? 'Edit Dietary Profile' : 'Add Dietary Profile'}</h2>
                <button onClick={() => { setDialogOpen(false); resetForm(); }} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
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
                    className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Dietary Restriction</label>
                  <select value={form.allergyType} onChange={(e) => setForm({ ...form, allergyType: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm">
                    {ALLERGY_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Severity</label>
                  <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm">
                    {SEVERITY_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" rows={2} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => { setDialogOpen(false); resetForm(); }} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">{editItem ? 'Update' : 'Save'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}


