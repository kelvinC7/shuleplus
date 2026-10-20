'use client';

import { useState, useEffect } from 'react';
import { Plus, Bookmark, Trash2, Edit, AlertCircle } from 'lucide-react';
import { LibPageLayout } from '@/components/lib-page-layout';
import { LibModal, FormField } from '@/components/lib-modal';
import { libApi } from '@/services/lib-api';
import type { Subject } from '@/types';

export default function SubjectsView() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState({ name: '', code: '', category: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await libApi.getSubjects();
      setSubjects(Array.isArray(data) ? data : data.subjects ?? []);
    } catch { setSubjects([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', code: '', category: '' });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (s: Subject) => {
    setEditing(s);
    setForm({ name: s.name, code: s.code ?? '', category: s.category ?? '' });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editing) {
        await libApi.put(`/subjects/${editing.id}`, form);
      } else {
        await libApi.post('/subjects', form);
      }
      setModalOpen(false);
      load();
    } catch (err: any) {
      setError(err.message ?? 'Failed to save subject');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this subject?')) return;
    try { await libApi.del(`/subjects/${id}`); load(); } catch { /* empty */ }
  };

  return (
    <LibPageLayout
      title="Subjects"
      subtitle="Manage academic subjects for resource classification"
      actions={
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Add Subject
        </button>
      }
    >
      <LibModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Subject' : 'New Subject'}
        subtitle={editing ? 'Update subject details' : 'Add a new academic subject'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <FormField label="Name" required>
            <input className="input" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Mathematics, English" required autoFocus />
          </FormField>
          <FormField label="Code">
            <input className="input" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} placeholder="e.g. MATH, ENG" />
          </FormField>
          <FormField label="Category">
            <input className="input" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} placeholder="e.g. Sciences, Languages" />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-navy border-t-transparent" /> : null}
              {saving ? 'Saving...' : editing ? 'Update Subject' : 'Create Subject'}
            </button>
          </div>
        </form>
      </LibModal>

      <div className="hr-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-slate-50/50">
              <th className="px-5 py-3.5 font-semibold text-navy">Name</th>
              <th className="px-5 py-3.5 font-semibold text-navy">Code</th>
              <th className="hidden px-5 py-3.5 font-semibold text-navy md:table-cell">Books</th>
              <th className="px-5 py-3.5 font-semibold text-navy">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-5 py-12 text-center text-muted"><div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></td></tr>
            ) : subjects.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <Bookmark size={36} className="text-slate-300" />
                  <p className="font-semibold text-navy">No subjects yet</p>
                  <p className="text-xs text-muted">Create your first subject to classify resources</p>
                  <button onClick={openCreate} className="btn-primary mt-2"><Plus size={16} /> Add Subject</button>
                </div>
              </td></tr>
            ) : subjects.map((s) => (
              <tr key={s.id} className="border-b border-border/40 transition-colors hover:bg-slate-50/50">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-navy to-navy-light text-primary text-xs font-bold">
                      {s.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-semibold text-navy">{s.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="badge bg-navy/5 text-navy text-[11px] font-bold">{s.code ?? '—'}</span>
                </td>
                <td className="hidden px-5 py-3.5 text-muted md:table-cell">—</td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(s)} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-slate-100 hover:text-navy"><Edit size={15} /></button>
                    <button onClick={() => handleDelete(s.id)} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-danger"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </LibPageLayout>
  );
}
