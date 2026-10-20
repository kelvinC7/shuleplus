'use client';

import { useState, useEffect } from 'react';
import { Download, Plus, AlertCircle } from 'lucide-react';
import { LibPageLayout } from '@/components/lib-page-layout';
import { LibModal, FormField } from '@/components/lib-modal';
import { LibDataTable } from '@/components/lib-data-table';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { libApi } from '@/services/lib-api';
import type { DigitalResource } from '@/types';

const emptyForm = () => ({
  title: '',
  description: '',
  fileType: 'PDF',
  fileUrl: '',
  fileName: '',
  uploadedBy: '',
  classLevel: '',
});

export default function DigitalView() {
  const [resources, setResources] = useState<DigitalResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DigitalResource | null>(null);
  const [viewing, setViewing] = useState<DigitalResource | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DigitalResource | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await libApi.getDigitalResources();
      setResources(Array.isArray(data) ? data : []);
    } catch { setResources([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setError('');
    setModalOpen(true);
  };

  const openEdit = (r: DigitalResource) => {
    setEditing(r);
    setForm({
      title: r.title,
      description: r.description ?? '',
      fileType: r.fileType,
      fileUrl: r.fileUrl,
      fileName: r.fileName,
      uploadedBy: r.uploadedBy ?? '',
      classLevel: r.classLevel ?? '',
    });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editing) {
        await libApi.updateDigitalResource(editing.id, form);
      } else {
        await libApi.createDigitalResource(form);
      }
      setModalOpen(false);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await libApi.deleteDigitalResource(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch { /* api error */ } finally { setDeleting(false); }
  };

  return (
    <LibPageLayout
      title="Digital Library"
      subtitle="E-books, audiobooks, and digital materials"
      actions={
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Upload Resource
        </button>
      }
      kpis={[
        { label: 'Total Resources', value: resources.length, icon: <Download size={20} /> },
        { label: 'Total Downloads', value: resources.reduce((s, r) => s + r.downloadCount, 0), icon: <Download size={20} /> },
      ]}
    >
      <LibModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Digital Resource' : 'Upload Digital Resource'}
        subtitle={editing ? 'Update resource details' : 'Add a new digital resource'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <FormField label="Title" required>
            <input className="input" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required autoFocus />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="File Type" required>
              <select className="input" value={form.fileType} onChange={(e) => setForm((p) => ({ ...p, fileType: e.target.value }))}>
                {['PDF', 'EBOOK', 'AUDIO', 'VIDEO', 'DOCUMENT', 'SPREADSHEET'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </FormField>
            <FormField label="File Name" required>
              <input className="input" value={form.fileName} onChange={(e) => setForm((p) => ({ ...p, fileName: e.target.value }))} required />
            </FormField>
            <FormField label="File URL" required className="sm:col-span-2">
              <input className="input" value={form.fileUrl} onChange={(e) => setForm((p) => ({ ...p, fileUrl: e.target.value }))} required placeholder="https://..." />
            </FormField>
            <FormField label="Uploaded By">
              <input className="input" value={form.uploadedBy} onChange={(e) => setForm((p) => ({ ...p, uploadedBy: e.target.value }))} />
            </FormField>
            <FormField label="Class Level">
              <input className="input" value={form.classLevel} onChange={(e) => setForm((p) => ({ ...p, classLevel: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Description">
            <textarea className="input min-h-[80px]" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : editing ? 'Update' : 'Upload'}
            </button>
          </div>
        </form>
      </LibModal>

      <LibModal open={Boolean(viewing)} onClose={() => setViewing(null)} title={viewing?.title ?? 'Details'} size="md">
        {viewing && (
          <div className="space-y-3 text-sm">
            <p><span className="font-bold text-muted">Type:</span> {viewing.fileType}</p>
            <p><span className="font-bold text-muted">File:</span> {viewing.fileName}</p>
            <p><span className="font-bold text-muted">Downloads:</span> {viewing.downloadCount}</p>
            {viewing.description && <p className="text-navy">{viewing.description}</p>}
            <a href={viewing.fileUrl} target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex">
              <Download size={14} /> Open File
            </a>
          </div>
        )}
      </LibModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Resource"
        message={`Delete "${deleteTarget?.title}"?`}
        confirmLabel="Delete"
        loading={deleting}
      />

      <LibDataTable
        data={resources}
        rowKey={(r) => r.id}
        loading={loading}
        emptyMessage="No digital resources yet"
        emptyAction={<button onClick={openCreate} className="btn-primary"><Plus size={16} /> Upload</button>}
        onView={setViewing}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
        columns={[
          { key: 'title', header: 'Title', render: (r) => <span className="font-semibold text-navy">{r.title}</span> },
          { key: 'type', header: 'Type', render: (r) => <span className="badge bg-navy/5 text-navy">{r.fileType}</span> },
          { key: 'file', header: 'File', className: 'hidden sm:table-cell', render: (r) => <span className="text-muted">{r.fileName}</span> },
          { key: 'downloads', header: 'Downloads', render: (r) => <span className="font-medium text-navy">{r.downloadCount}</span> },
        ]}
      />
    </LibPageLayout>
  );
}
