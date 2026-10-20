'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { inventoryApi } from '@/services/inventory-api';
import type { ProductCategory } from '@/types';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ExportDropdown } from '@/components/export-dropdown';
import type { ExportColumn } from '@/lib/export-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ProductCategory | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const load = () => inventoryApi.categories.list().then(setCategories).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editItem) {
        await inventoryApi.categories.update(editItem.id, { name, description });
        toast.success('Category updated');
      } else {
        await inventoryApi.categories.create({ name, description });
        toast.success('Category created');
      }
      setDialogOpen(false);
      setEditItem(null);
      setName('');
      setDescription('');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error saving category');
    }
  };

  const handleEdit = (cat: ProductCategory) => {
    setEditItem(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    toast('Delete this category?', {
      description: 'This action cannot be undone.',
      duration: 8000,
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            await inventoryApi.categories.remove(id);
            toast.success('Category deleted');
            load();
          } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Error deleting category');
          }
        },
      },
      cancel: { label: 'Cancel', onClick: () => {} },
    });
  };

  if (loading) return <MainLayout><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div></MainLayout>;

  const exportColumns: ExportColumn[] = [
    { header: 'Name', accessor: 'name' },
    { header: 'Description', accessor: 'description' },
    { header: 'Products', accessor: 'products' },
    { header: 'Status', accessor: 'status' },
  ];

  const exportData = categories.map(cat => ({
    name: cat.name,
    description: cat.description || '-',
    products: cat._count?.products ?? 0,
    status: cat.isActive ? 'Active' : 'Inactive',
  }));

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Product Categories</h1>
            <p className="text-sm text-muted-foreground">Manage your product categories</p>
          </div>
          <div className="flex gap-2 pt-4 items-center justify-between sm:pt-0">
            <ExportDropdown title="Product Categories" columns={exportColumns} data={exportData} />
            <button onClick={() => { setEditItem(null); setName(''); setDescription(''); setDialogOpen(true); }}
              className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">
              <Plus className="h-4 w-4" /> Add Category
            </button>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setDialogOpen(false); setEditItem(null); } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editItem ? 'Edit Category' : 'New Category'}</DialogTitle>
            </DialogHeader>
            <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input value={name} onChange={e => setName(e.target.value)} required
                  className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Category name" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm" rows={2} placeholder="Optional description" />
              </div>
              <DialogFooter>
                <DialogClose render={<button type="button" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-all active:scale-95" />}>Cancel</DialogClose>
                <button type="submit" className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-all active:scale-95">{editItem ? 'Update' : 'Create'}</button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <div className="rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Description</th>
                <th className="text-center px-4 py-3 font-medium">Products</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{cat.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{cat.description || '-'}</td>
                  <td className="px-4 py-3 text-center">{cat._count?.products ?? 0}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleEdit(cat)} className="rounded-lg p-2 hover:bg-gray-100"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(cat.id)} className="rounded-lg p-2 hover:bg-red-50 text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No categories yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
