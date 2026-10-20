'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { AssetsPageLayout } from '@/components/assets-page-layout';
import { assetsApi } from '@/services/assets-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import type { Category } from '@/types';

const EMPTY = { name: '', description: '', depreciationRate: 0, icon: '' };

export function CategoriesView() {
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await assetsApi.categories();
      setCategories(data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load categories'), 'Error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setShowModal(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    setForm({
      name: cat.name,
      description: cat.description ?? '',
      depreciationRate: cat.depreciationRate ?? 0,
      icon: cat.icon ?? '',
    });
    setShowModal(true);
  }

  async function save() {
    const name = form.name.trim();
    if (!name) {
      toast.error('Category name is required');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name,
        description: form.description.trim() || undefined,
        icon: form.icon.trim() || undefined,
        depreciationRate: Number(form.depreciationRate) || 0,
      };
      if (editing) {
        await assetsApi.updateCategory(editing.id, body);
        toast.success(`Category "${name}" updated.`, 'Updated');
      } else {
        await assetsApi.createCategory(body);
        toast.success(`Category "${name}" created.`, 'Created');
      }
      setShowModal(false);
      setForm(EMPTY);
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save category'), 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this category?')) return;
    try {
      await assetsApi.deleteCategory(id);
      toast.success('Category deleted.', 'Deleted');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete category'), 'Delete failed');
    }
  }

  return (
    <AssetsPageLayout
      title="Asset Categories"
      subtitle="Depreciation rates and classification buckets"
      actions={
        <button type="button" onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Add category
        </button>
      }
      kpis={[
        { label: 'Categories', value: categories.length },
        {
          label: 'Avg rate',
          value:
            categories.length === 0
              ? '—'
              : `${(
                  categories.reduce((s, c) => s + (c.depreciationRate || 0), 0) / categories.length
                ).toFixed(1)}%`,
        },
      ]}
    >
      <div className="hr-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/80">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-[0.04em] text-muted">Name</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-[0.04em] text-muted">Depreciation %</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-[0.04em] text-muted">Description</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.04em] text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-muted">
                    Loading…
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-muted">
                    No categories yet. Create your first category.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="border-b border-border/70 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3.5 font-medium text-navy">{cat.name}</td>
                    <td className="px-4 py-3.5">{cat.depreciationRate}%</td>
                    <td className="px-4 py-3.5 text-muted">{cat.description || '—'}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(cat)}
                          className="rounded-lg p-2 text-muted hover:bg-slate-100 hover:text-navy"
                          aria-label="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(cat.id)}
                          className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                          aria-label="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-navy">
              {editing ? 'Edit Category' : 'Add Category'}
            </h2>
            <div className="mt-4 space-y-3">
              <input
                className="input"
                placeholder="Category name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                className="input"
                type="number"
                min={0}
                max={100}
                step={0.1}
                placeholder="Depreciation rate %"
                value={form.depreciationRate}
                onChange={(e) => setForm({ ...form, depreciationRate: Number(e.target.value) })}
              />
              <input
                className="input"
                placeholder="Icon (optional)"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
              />
              <textarea
                className="input"
                placeholder="Description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="button" onClick={() => void save()} disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AssetsPageLayout>
  );
}
