'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { cafeteriaApi } from '@/services/cafeteria-api';
import { toast } from 'sonner';
import { Plus, X, Search, ShieldCheck, CheckCircle, XCircle } from 'lucide-react';
import type { HygieneChecklist } from '@/types';

const CHECK_TYPES = ['KITCHEN_CLEANING', 'EQUIPMENT_CLEANING', 'FOOD_TEMPERATURE', 'WATER_QUALITY', 'HEALTH_INSPECTION', 'SANITATION'];
const CHECK_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'];

const defaultItems = [
  'Kitchen floors cleaned', 'Countertops sanitized', 'Equipment cleaned and maintained',
  'Refrigerator temperature checked', 'Freezer temperature checked', 'Water quality tested',
  'Handwashing stations stocked', 'Fire extinguisher checked', 'First aid kit available',
  'Waste bins emptied', 'Ventilation system working', 'Pest control measures in place',
];

export default function HygienePage() {
  const [checklists, setChecklists] = useState<HygieneChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    checkDate: new Date().toISOString().split('T')[0],
    checkType: 'KITCHEN_CLEANING',
    checkedBy: '',
    notes: '',
    items: defaultItems.map(item => ({ item, status: 'PENDING', notes: '' })),
  });
  const [filterStatus, setFilterStatus] = useState('');

  const load = useCallback(async () => {
    try {
      const params: any = {};
      if (filterStatus) params.status = filterStatus;
      const data = await cafeteriaApi.hygiene.list(params);
      setChecklists(data);
    } catch {
      toast.error('Failed to load checklists');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    try {
      await cafeteriaApi.hygiene.create(form);
      toast.success('Checklist submitted');
      setDialogOpen(false);
      load();
    } catch {
      toast.error('Failed to submit checklist');
    }
  };

  const toggleItemStatus = (idx: number) => {
    const items = [...form.items];
    items[idx].status = items[idx].status === 'PASSED' ? 'PENDING' : 'PASSED';
    setForm({ ...form, items });
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-gray-100 text-gray-700',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
      COMPLETED: 'bg-green-100 text-green-700',
      FAILED: 'bg-red-100 text-red-700',
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
            <h1 className="text-2xl font-bold">Hygiene & Safety</h1>
            <p className="text-sm text-muted-foreground">Daily hygiene checklists and safety inspections</p>
          </div>
          <button onClick={() => setDialogOpen(true)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Checklist
          </button>
        </div>

        <div className="flex gap-1">
          <button onClick={() => setFilterStatus('')} className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${!filterStatus ? 'bg-primary text-white' : 'bg-white border hover:bg-gray-50'}`}>All</button>
          {CHECK_STATUSES.map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${filterStatus === s ? 'bg-primary text-white' : 'bg-white border hover:bg-gray-50'}`}>{s.replace(/_/g, ' ')}</button>
          ))}
        </div>

        {dialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">New Hygiene Checklist</h2>
                <button onClick={() => setDialogOpen(false)} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input type="date" value={form.checkDate} onChange={(e) => setForm({ ...form, checkDate: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Check Type</label>
                  <select value={form.checkType} onChange={(e) => setForm({ ...form, checkType: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm">
                    {CHECK_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Checked By</label>
                  <input value={form.checkedBy} onChange={(e) => setForm({ ...form, checkedBy: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Staff name" />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Checklist Items</h3>
                <div className="space-y-2">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 rounded-lg border p-3">
                      <button onClick={() => toggleItemStatus(idx)} className={`rounded-lg p-1 ${item.status === 'PASSED' ? 'text-green-600' : 'text-gray-400'}`}>
                        <CheckCircle className="h-5 w-5" />
                      </button>
                      <span className={`text-sm flex-1 ${item.status === 'PASSED' ? 'line-through text-muted-foreground' : ''}`}>{item.item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm" rows={2} placeholder="Additional observations" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setDialogOpen(false)} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">Submit</button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {checklists.map((check) => (
            <div key={check.id} className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{check.checkType.replace(/_/g, ' ')}</h3>
                    {statusBadge(check.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Date: {new Date(check.checkDate).toLocaleDateString()} | Checked by: {check.checkedBy}</p>
                </div>
                {check.score !== null && (
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">{check.score}%</p>
                    <p className="text-xs text-muted-foreground">Score</p>
                  </div>
                )}
              </div>
              {check.items?.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {check.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      {item.status === 'PASSED' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className={item.status === 'PASSED' ? 'text-muted-foreground' : 'text-red-600'}>{item.item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {checklists.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">No checklists found</div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
