'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { HrPageLayout } from '@/components/hr-page-layout';
import { hrApi } from '@/services/hr-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import type { EmploymentCategory } from '@/types';

const COLORS = ['bg-amber-100 text-amber-800', 'bg-blue-100 text-blue-800', 'bg-green-100 text-green-800', 'bg-violet-100 text-violet-800', 'bg-orange-100 text-orange-800', 'bg-slate-100 text-slate-800'];

export function CategoriesView() {
  const toast = useToast();
  const [categories, setCategories] = useState<EmploymentCategory[]>([]);
  const [totalStaff, setTotalStaff] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  async function load() {
    const { data } = await hrApi.categories();
    if (!data.categories.length) {
      const seeded = await hrApi.seedCategories();
      setCategories(seeded.data.categories);
      setTotalStaff(seeded.data.totalStaff);
    } else {
      setCategories(data.categories);
      setTotalStaff(data.totalStaff);
    }
  }

  useEffect(() => { load(); }, []);

  async function create() {
    const name = form.name.trim();
    try {
      await hrApi.createCategory(form);
      setShowModal(false);
      setForm({ name: '', description: '' });
      toast.success(`Category "${name}" created.`, 'Category created');
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to create category.'), 'Create failed');
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this category?')) return;
    try {
      await hrApi.deleteCategory(id);
      toast.success('Category deleted.', 'Deleted');
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to delete category.'), 'Delete failed');
    }
  }

  return (
    <HrPageLayout
      title="Employment Categories"
      subtitle="Organize staff into employment type and role classification buckets"
      actions={<button type="button" onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} /> Create category</button>}
      kpis={[
        { label: 'Categories', value: categories.length },
        { label: 'Total Staff', value: totalStaff },
      ]}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat, i) => (
          <div key={cat.id} className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <span className={`badge ${COLORS[i % COLORS.length]}`}>{cat.name}</span>
              <div className="flex gap-1">
                <button type="button" className="rounded-lg p-1.5 text-muted hover:bg-slate-100"><Pencil size={14} /></button>
                <button type="button" onClick={() => remove(cat.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted">{cat.description ?? 'No description'}</p>
            <p className="mt-4 text-3xl font-bold text-navy">{cat.employeeCount}</p>
            <p className="text-xs text-muted">{cat.percentage}% of total staff</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-ochre to-gold" style={{ width: `${cat.percentage}%` }} />
            </div>
            <Link href={`/directory?category=${cat.id}`} className="btn-secondary mt-4 w-full">View employees</Link>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-navy">Create Category</h2>
            <div className="mt-4 space-y-3">
              <input className="input" placeholder="Category name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <textarea className="input" placeholder="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button type="button" onClick={create} className="btn-primary">Create</button>
            </div>
          </div>
        </div>
      )}
    </HrPageLayout>
  );
}
