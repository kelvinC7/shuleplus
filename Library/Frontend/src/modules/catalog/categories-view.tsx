'use client';

import { useState, useEffect } from 'react';
import { Plus, Tags, AlertCircle } from 'lucide-react';
import { LibPageLayout } from '@/components/lib-page-layout';
import { LibModal, FormField } from '@/components/lib-modal';
import { LibDataTable } from '@/components/lib-data-table';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { libApi } from '@/services/lib-api';
import type { ResourceCategory } from '@/types';

const RESOURCE_TYPES = [
  'TEXTBOOK', 'REFERENCE', 'NOVEL', 'STORY_BOOK', 'DICTIONARY', 'ENCYCLOPEDIA',
  'TEACHER_GUIDE', 'REVISION_MATERIAL', 'PAST_PAPER', 'MAGAZINE', 'NEWSPAPER',
  'EBOOK', 'AUDIO_BOOK', 'EDUCATIONAL_VIDEO', 'RESEARCH_MATERIAL',
];

export default function CategoriesView() {
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ResourceCategory | null>(null);
  const [viewing, setViewing] = useState<ResourceCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ResourceCategory | null>(null);
  const [form, setForm] = useState({ name: '', description: '', type: 'TEXTBOOK' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await libApi.getCategories();
      setCategories(Array.isArray(data) ? data : data.categories ?? []);
    } catch { setCategories([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', type: 'TEXTBOOK' });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (cat: ResourceCategory) => {
    setEditing(cat);
    setForm({ name: cat.name, description: cat.description ?? '', type: cat.type });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editing) {
        await libApi.updateCategory(editing.id, form);
      } else {
        await libApi.createCategory(form);
      }
      setModalOpen(false);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save category');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await libApi.deleteCategory(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch { /* api */ } finally { setDeleting(false); }
  };

  return (
    <LibPageLayout
      title="Categories"
      subtitle="Organize resources by category"
      actions={
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Add Category
        </button>
      }
      kpis={[
        { label: 'Total Categories', value: categories.length, icon: <Tags size={20} /> },
      ]}
    >
      <LibModal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Category' : 'New Category'} subtitle={editing ? 'Update category details' : 'Add a new resource category'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <FormField label="Name" required>
            <input className="input" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required autoFocus />
          </FormField>
          <FormField label="Type" required>
            <select className="input" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
              {RESOURCE_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Description">
            <textarea className="input min-h-[80px]" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </LibModal>

      <LibModal open={Boolean(viewing)} onClose={() => setViewing(null)} title={viewing?.name ?? 'Category'} size="md">
        {viewing && (
          <div className="space-y-2 text-sm">
            <p><span className="font-bold text-muted">Type:</span> {viewing.type.replace(/_/g, ' ')}</p>
            {viewing.description && <p className="text-navy">{viewing.description}</p>}
            {viewing.resourceCount != null && <p><span className="font-bold text-muted">Books:</span> {viewing.resourceCount}</p>}
          </div>
        )}
      </LibModal>

      <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Category" message={`Delete "${deleteTarget?.name}"?`} confirmLabel="Delete" loading={deleting} />

      <LibDataTable
        data={categories}
        rowKey={(c) => c.id}
        loading={loading}
        emptyMessage="No categories yet"
        emptyAction={<button onClick={openCreate} className="btn-primary"><Plus size={16} /> Add Category</button>}
        onView={setViewing}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
        columns={[
          {
            key: 'name',
            header: 'Name',
            render: (c) => (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-navy to-navy-light text-primary">
                  <Tags size={16} />
                </div>
                <span className="font-semibold text-navy">{c.name}</span>
              </div>
            ),
          },
          { key: 'type', header: 'Type', render: (c) => <span className="badge bg-navy/5 text-navy text-[11px] font-bold">{c.type.replace(/_/g, ' ')}</span> },
          { key: 'books', header: 'Books', className: 'hidden md:table-cell', render: (c) => <span className="text-muted">{c.resourceCount ?? '—'}</span> },
          { key: 'desc', header: 'Description', className: 'hidden lg:table-cell', render: (c) => <span className="line-clamp-1 text-muted">{c.description ?? '—'}</span> },
        ]}
      />
    </LibPageLayout>
  );
}
