'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { inventoryApi } from '@/services/inventory-api';
import type { Store } from '@/types';
import { Plus, Pencil, Trash2, Warehouse, MapPin, User, LayoutList } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/searchable-select';

const STORE_TYPES = [
  { value: 'MAIN', label: 'Main' },
  { value: 'BRANCH', label: 'Branch' },
  { value: 'WAREHOUSE', label: 'Warehouse' },
  { value: 'SUB_STORE', label: 'Sub-Store' },
];

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [shelvesDialogStore, setShelvesDialogStore] = useState<Store | null>(null);
  const [shelves, setShelves] = useState<any[]>([]);
  const [shelvesLoading, setShelvesLoading] = useState(false);
  const [shelfForm, setShelfForm] = useState({ name: '', code: '', description: '' });
  const [shelfDialogOpen, setShelfDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Store | null>(null);
  const [form, setForm] = useState({
    name: '', code: '', type: 'BRANCH', location: '', managerName: '', managerContact: '',
  });

  const load = () => inventoryApi.stores.list().then(setStores).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ name: '', code: '', type: 'BRANCH', location: '', managerName: '', managerContact: '' });
    setEditItem(null);
  };

  const openEdit = (s: Store) => {
    setEditItem(s);
    setForm({
      name: s.name, code: s.code, type: s.type, location: s.location || '',
      managerName: s.managerName || '', managerContact: s.managerContact || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editItem) {
        await inventoryApi.stores.update(editItem.id, form);
        toast.success('Store updated');
      } else {
        await inventoryApi.stores.create(form);
        toast.success('Store created');
      }
      setDialogOpen(false);
      resetForm();
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error saving store');
    }
  };

  const handleDelete = (s: Store) => {
    toast(`Archive "${s.name}"?`, {
      description: 'The store will be deactivated.',
      duration: 8000,
      action: {
        label: 'Archive',
        onClick: async () => {
          try {
            await inventoryApi.stores.remove(s.id);
            load();
            toast.success(`"${s.name}" archived`);
          } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Archive failed');
            load();
          }
        },
      },
      cancel: { label: 'Cancel', onClick: () => {} },
    });
  };

  const openShelves = async (s: Store) => {
    setShelvesDialogStore(s);
    setShelvesLoading(true);
    try {
      const data = await inventoryApi.stores.shelves.list(s.id);
      setShelves(data);
    } catch {
      toast.error('Failed to load shelves');
    } finally {
      setShelvesLoading(false);
    }
  };

  const handleAddShelf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shelvesDialogStore) return;
    try {
      await inventoryApi.stores.shelves.create(shelvesDialogStore.id, shelfForm);
      toast.success('Shelf added');
      setShelfDialogOpen(false);
      setShelfForm({ name: '', code: '', description: '' });
      openShelves(shelvesDialogStore);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error adding shelf');
    }
  };

  const typeBadge = (type: string) => {
    const map: Record<string, string> = {
      MAIN: 'bg-amber-100 text-amber-700',
      BRANCH: 'bg-green-100 text-green-700',
      WAREHOUSE: 'bg-orange-100 text-orange-700',
      SUB_STORE: 'bg-purple-100 text-purple-700',
    };
    return map[type] || 'bg-gray-100 text-gray-700';
  };

  if (loading) return <MainLayout><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div></MainLayout>;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Stores</h1>
            <p className="text-sm text-muted-foreground">Manage warehouses, branches, and sub-stores</p>
          </div>
          <button onClick={() => { resetForm(); setDialogOpen(true); }}
            className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-all active:scale-95 pt-4 sm:pt-0">
            <Plus className="h-4 w-4" /> Add Store
          </button>
        </div>

        <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setDialogOpen(false); resetForm(); } }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editItem ? 'Edit Store' : 'New Store'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Code *</label>
                  <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} required placeholder="e.g. WH-01"
                    className="w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <SearchableSelect
                    value={form.type}
                    onChange={v => setForm({ ...form, type: v })}
                    options={STORE_TYPES}
                    placeholder="Search type"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Manager</label>
                  <input value={form.managerName} onChange={e => setForm({ ...form, managerName: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Contact</label>
                  <input value={form.managerContact} onChange={e => setForm({ ...form, managerContact: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Location</label>
                  <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
              </div>
              <DialogFooter>
                <DialogClose render={<button type="button" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-all active:scale-95" />}>Cancel</DialogClose>
                <button type="submit" className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-all active:scale-95">{editItem ? 'Update' : 'Create'}</button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={shelvesDialogStore !== null} onOpenChange={open => { if (!open) { setShelvesDialogStore(null); setShelves([]); } }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Shelves — {shelvesDialogStore?.name}</DialogTitle>
            </DialogHeader>
            {shelvesLoading ? (
              <p className="text-sm text-muted-foreground py-4">Loading...</p>
            ) : (
              <div className="space-y-4">
                {shelves.length > 0 ? (
                  <div className="divide-y rounded-lg border">
                    {shelves.map(sh => (
                      <div key={sh.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">{sh.name}</p>
                          <p className="text-xs text-muted-foreground">{sh.code}</p>
                        </div>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${sh.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {sh.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No shelves yet</p>
                )}
                {!shelfDialogOpen && (
                  <button onClick={() => setShelfDialogOpen(true)}
                    className="w-full rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                    <Plus className="h-4 w-4" /> Add Shelf
                  </button>
                )}
                {shelfDialogOpen && (
                  <form onSubmit={handleAddShelf} className="space-y-3 rounded-lg border p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium mb-1">Name *</label>
                        <input value={shelfForm.name} onChange={e => setShelfForm({ ...shelfForm, name: e.target.value })} required className="w-full rounded-lg border px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Code *</label>
                        <input value={shelfForm.code} onChange={e => setShelfForm({ ...shelfForm, code: e.target.value.toUpperCase() })} required placeholder="e.g. A-01"
                          className="w-full rounded-lg border px-3 py-2 text-sm" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <input value={shelfForm.description} onChange={e => setShelfForm({ ...shelfForm, description: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => { setShelfDialogOpen(false); setShelfForm({ name: '', code: '', description: '' }); }}
                        className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-all active:scale-95">Cancel</button>
                      <button type="submit" className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-all active:scale-95">Add</button>
                    </div>
                  </form>
                )}
              </div>
            )}
            <DialogFooter>
              <DialogClose render={<button type="button" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-all active:scale-95" />}>Close</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map(s => (
            <div key={s.id} className="rounded-xl border bg-white p-5 shadow-sm space-y-3 transition-all hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-100 p-2">
                    <Warehouse className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{s.name}</h3>
                    <p className="text-xs text-muted-foreground">{s.code}</p>
                  </div>
                </div>
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {s.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${typeBadge(s.type)}`}>
                    {s.type?.replace('_', ' ')}
                  </span>
                </p>
                {s.location && <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {s.location}</p>}
                {s.managerName && <p className="flex items-center gap-2"><User className="h-3.5 w-3.5" /> {s.managerName}</p>}
              </div>
              <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                <span>{s._count?.products ?? 0} products · {s._count?.shelves ?? 0} shelves · {s._count?.batches ?? 0} batches</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => openShelves(s)} className="rounded-lg p-1.5 hover:bg-gray-100" title="View shelves"><LayoutList className="h-3.5 w-3.5" /></button>
                  <button onClick={() => openEdit(s)} className="rounded-lg p-1.5 hover:bg-gray-100" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(s)} className="rounded-lg p-1.5 hover:bg-red-50 text-red-600" title="Archive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
          {stores.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">No stores yet</div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
