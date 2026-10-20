'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { cafeteriaApi } from '@/services/cafeteria-api';
import { toast } from 'sonner';
import { Plus, Trash2, X, Search, CalendarDays } from 'lucide-react';
import type { DutyRoster, KitchenStaff } from '@/types';

const SHIFTS = ['MORNING', 'AFTERNOON', 'EVENING'];
const ROSTER_STATUSES = ['SCHEDULED', 'ON_DUTY', 'COMPLETED', 'ABSENT'];

const initialForm = {
  staffId: '',
  rosterDate: new Date().toISOString().split('T')[0],
  shift: 'MORNING',
  duty: '',
  notes: '',
};

export default function DutyRosterPage() {
  const [roster, setRoster] = useState<DutyRoster[]>([]);
  const [staff, setStaff] = useState<KitchenStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const [rosterData, staffData] = await Promise.all([
        cafeteriaApi.dutyRoster.list({ date: selectedDate }),
        cafeteriaApi.kitchenStaff.list(),
      ]);
      setRoster(rosterData);
      setStaff(staffData);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    try {
      await cafeteriaApi.dutyRoster.create(form);
      toast.success('Duty assigned');
      setDialogOpen(false);
      setForm(initialForm);
      load();
    } catch {
      toast.error('Failed to assign duty');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this duty assignment?')) return;
    try {
      await cafeteriaApi.dutyRoster.remove(id);
      toast.success('Duty removed');
      load();
    } catch {
      toast.error('Failed to remove duty');
    }
  };

  const filteredRoster = roster.filter(r => {
    if (search && !r.staff?.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      SCHEDULED: 'bg-gray-100 text-gray-700',
      ON_DUTY: 'bg-green-100 text-green-700',
      COMPLETED: 'bg-amber-100 text-amber-700',
      ABSENT: 'bg-red-100 text-red-700',
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
            <h1 className="text-2xl font-bold">Duty Roster</h1>
            <p className="text-sm text-muted-foreground">Schedule kitchen staff shifts and duties</p>
          </div>
          <button onClick={() => { setForm(initialForm); setDialogOpen(true); }} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Assign Duty
          </button>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-primary" />
          </div>
        </div>

        {dialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Assign Duty</h2>
                <button onClick={() => setDialogOpen(false)} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Staff Member</label>
                  <select value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm">
                    <option value="">Select staff</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role.replace(/_/g, ' ')})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input type="date" value={form.rosterDate} onChange={(e) => setForm({ ...form, rosterDate: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Shift</label>
                  <select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm">
                    {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Duty Description</label>
                  <input value={form.duty} onChange={(e) => setForm({ ...form, duty: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="e.g., Prepare lunch, Clean kitchen" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setDialogOpen(false)} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">Assign</button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium">Staff</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium">Shift</th>
                <th className="text-left px-4 py-3 font-medium">Duty</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoster.map((r) => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.staff?.name || 'Unknown'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.staff?.role?.replace(/_/g, ' ') || '-'}</td>
                  <td className="px-4 py-3">{r.shift}</td>
                  <td className="px-4 py-3">{r.duty || '-'}</td>
                  <td className="px-4 py-3">{statusBadge(r.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(r.id)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
              {filteredRoster.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No duties scheduled for this date</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
