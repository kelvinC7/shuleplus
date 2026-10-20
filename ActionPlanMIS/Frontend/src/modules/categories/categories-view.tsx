'use client';

import { useEffect, useState } from 'react';
import { Plus, Loader2, Palette } from 'lucide-react';
import { apApi } from '@/services/action-plan-api';
import { ApPageLayout } from '@/components/ap-page-layout';
import { ApModal } from '@/components/ap-modal';
import type { Category } from '@/types';

const DEFAULT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#6b7280', '#f97316', '#ef4444', '#6366f1', '#06b6d4', '#d946ef'];

export function CategoriesView() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#fcb038');

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);
    try {
      const { data } = await apApi.listCategories();
      setCategories(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function createCategory() {
    if (!name.trim()) return;
    try {
      await apApi.createCategory({ name, color });
      setName('');
      setShowForm(false);
      loadCategories();
    } catch (err) { console.error(err); }
  }

  async function seedDefaults() {
    try {
      await apApi.seedDefaultCategories();
      loadCategories();
    } catch (err) { console.error(err); }
  }

  return (
    <>
      <ApPageLayout
        actions={
          <>
            <button type="button" onClick={() => setShowForm(true)} className="btn-primary">
              <Plus size={14} />
              Add Category
            </button>
            <button type="button" onClick={seedDefaults} className="btn-secondary">
              Seed Defaults
            </button>
          </>
        }
      >
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted">
          <Loader2 className="mr-2 animate-spin" size={16} />
          Loading…
        </div>
      ) : categories.length === 0 ? (
        <div className="py-20 text-center text-sm text-muted">
          No categories yet. Create one or seed defaults.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <div key={cat.id} className="card flex items-center gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
              >
                <Palette size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-navy">{cat.name}</p>
                <p className="text-xs text-muted">
                  {cat._count?.actionPlans ?? 0} plan(s)
                  {cat.description && ` · ${cat.description}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      </ApPageLayout>

      <ApModal open={showForm} eyebrow="Categories" title="Add Category" onClose={() => setShowForm(false)}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-navy">Category Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="e.g. Academic, Finance"
              onKeyDown={(e) => e.key === 'Enter' && createCategory()}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-navy">Color</label>
            <div className="flex gap-1">
              {DEFAULT_COLORS.slice(0, 6).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-lg ${color === c ? 'ring-2 ring-navy ring-offset-1' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <button onClick={createCategory} disabled={!name.trim()} className="btn-primary">
            <Plus size={14} />
            Create
          </button>
        </div>
      </ApModal>
    </>
  );
}
