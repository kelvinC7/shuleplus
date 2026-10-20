'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { cafeteriaApi } from '@/services/cafeteria-api';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Search, UserCheck } from 'lucide-react';
import type { KitchenStaff } from '@/types';

const STAFF_ROLES = ['CHEF', 'KITCHEN_ASSISTANT', 'STOREKEEPER', 'CLEANER', 'SUPERVISOR'];

const initialForm = {
  name: '',
  role: 'CHEF',
  phone: '',
  email: '',
  qualification: '',
  isActive: true,
};

export default function KitchenStaffPage() {
  const [staff, setStaff] = useState<KitchenStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<KitchenStaff | null>(null);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await cafeteriaApi.kitchenStaff.list();
      setStaff(data);
    } catch {
      toast.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setForm(initialForm); setEditItem(null); };

  const openCreate = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (s: KitchenStaff) => {
    setForm({ name: s.name, role: s.role, phone: s.phone || '', email: s.email || '', qualification: s.qualification || '', isActive: s.isActive });
    setEditItem(s);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editItem) {
        await cafeteriaApi.kitchenStaff.update(editItem.id, form);
        toast.success('Staff updated');
      } else {
        await cafeteriaApi.kitchenStaff.create(form);
        toast.success('Staff added');
      }
      setDialogOpen(false);
      resetForm();
      load();
    } catch {
      toast.error('Failed to save staff');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this staff member?')) return;
    try {
      await cafeteriaApi.kitchenStaff.remove(id);
      toast.success('Staff removed');
      load();
    } catch {
      toast.error('Failed to remove staff');
    }
  };

  const filteredStaff = staff.filter(s => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const roleBadge = (role: string) => {
    const styles: Record<string, string> = {
      CHEF: 'bg-amber-100 text-amber-700',
      KITCHEN_ASSISTANT: 'bg-green-100 text-green-700',
      STOREKEEPER: 'bg-purple-100 text-purple-700',
      CLEANER: 'bg-orange-100 text-orange-700',
      SUPERVISOR: 'bg-red-100 text-red-700',
    };
    return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[role] || 'bg-gray-100 text-gray-700'}`}>{role.replace(/_/g, ' ')}</span>;
  };

  if (loading) {
    return <MainLayout><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Kitchen Staff</h1>
            <p className="text-sm text-muted-foreground">Manage chefs, assistants, storekeepers, and kitchen staff</p>
          </div>
          <button onClick={openCreate} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Staff
          </button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-primary" />
        </div>

        {dialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{editItem ? 'Edit Staff' : 'Add Staff'}</h2>
                <button onClick={() => { setDialogOpen(false); resetForm(); }} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Full Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm">
                    {STAFF_ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Qualification</label>
                  <input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="e.g., Culinary Arts" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => { setDialogOpen(false); resetForm(); }} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">{editItem ? 'Update' : 'Add'}</button>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStaff.map((member) => (
            <div key={member.id} className="rounded-xl border bg-white p-5 shadow-sm space-y-3 transition-all hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-sm font-semibold text-white">
                    {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold">{member.name}</h3>
                    {roleBadge(member.role)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(member)} className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(member.id)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                {member.phone && <p>Phone: {member.phone}</p>}
                {member.email && <p>Email: {member.email}</p>}
                {member.qualification && <p>Qualification: {member.qualification}</p>}
              </div>
              <div className="flex items-center gap-1">
                <div className={`h-2 w-2 rounded-full ${member.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="text-xs text-muted-foreground">{member.isActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          ))}
          {filteredStaff.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">No staff members found</div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
