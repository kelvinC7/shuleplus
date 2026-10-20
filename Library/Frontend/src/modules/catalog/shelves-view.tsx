'use client';

import { useState, useEffect } from 'react';
import { Plus, MapPin, AlertCircle } from 'lucide-react';
import { LibPageLayout } from '@/components/lib-page-layout';
import { LibModal, FormField } from '@/components/lib-modal';
import { LibDataTable } from '@/components/lib-data-table';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { libApi } from '@/services/lib-api';
import type { ShelfLocation } from '@/types';

export default function ShelvesView() {
  const [shelves, setShelves] = useState<ShelfLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ShelfLocation | null>(null);
  const [viewing, setViewing] = useState<ShelfLocation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShelfLocation | null>(null);
  const [form, setForm] = useState({ building: 'Main', room: '', section: '', shelf: '', row: '', position: '', capacity: '50' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await libApi.getShelves();
      setShelves(Array.isArray(data) ? data : data.shelves ?? []);
    } catch { setShelves([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ building: 'Main', room: '', section: '', shelf: '', row: '', position: '', capacity: '50' });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (s: ShelfLocation) => {
    setEditing(s);
    setForm({
      building: s.building ?? 'Main',
      room: s.room ?? '',
      section: s.section ?? '',
      shelf: s.shelf ?? '',
      row: s.row ?? '',
      position: s.position ?? '',
      capacity: String(s.capacity ?? 50),
    });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { ...form, capacity: form.capacity ? Number(form.capacity) : 50 };
      if (editing) {
        await libApi.updateShelf(editing.id, payload);
      } else {
        await libApi.createShelf(payload);
      }
      setModalOpen(false);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save shelf');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await libApi.deleteShelf(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch { /* api */ } finally { setDeleting(false); }
  };

  const shelfLabel = (s: ShelfLocation) => `${s.building} · ${s.section} · ${s.shelf}`;

  return (
    <LibPageLayout
      title="Shelves"
      subtitle="Manage shelf locations in the library"
      actions={
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Add Shelf
        </button>
      }
      kpis={[{ label: 'Total Shelves', value: shelves.length, icon: <MapPin size={20} /> }]}
    >
      <LibModal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Shelf' : 'New Shelf'} subtitle={editing ? 'Update shelf location' : 'Add a new shelf location'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Building" required>
              <input className="input" value={form.building} onChange={(e) => setForm((p) => ({ ...p, building: e.target.value }))} required autoFocus />
            </FormField>
            <FormField label="Room">
              <input className="input" value={form.room} onChange={(e) => setForm((p) => ({ ...p, room: e.target.value }))} />
            </FormField>
            <FormField label="Section" required>
              <input className="input" value={form.section} onChange={(e) => setForm((p) => ({ ...p, section: e.target.value }))} required />
            </FormField>
            <FormField label="Shelf" required>
              <input className="input" value={form.shelf} onChange={(e) => setForm((p) => ({ ...p, shelf: e.target.value }))} required />
            </FormField>
            <FormField label="Row">
              <input className="input" value={form.row} onChange={(e) => setForm((p) => ({ ...p, row: e.target.value }))} />
            </FormField>
            <FormField label="Position">
              <input className="input" value={form.position} onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))} />
            </FormField>
            <FormField label="Capacity">
              <input className="input" type="number" min="1" value={form.capacity} onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))} />
            </FormField>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </LibModal>

      <LibModal open={Boolean(viewing)} onClose={() => setViewing(null)} title="Shelf Details" size="md">
        {viewing && (
          <div className="space-y-2 text-sm">
            <p><span className="font-bold text-muted">Location:</span> {shelfLabel(viewing)}</p>
            {viewing.room && <p><span className="font-bold text-muted">Room:</span> {viewing.room}</p>}
            {viewing.row && <p><span className="font-bold text-muted">Row:</span> {viewing.row}</p>}
            {viewing.position && <p><span className="font-bold text-muted">Position:</span> {viewing.position}</p>}
            {viewing.capacity != null && <p><span className="font-bold text-muted">Capacity:</span> {viewing.capacity} books</p>}
          </div>
        )}
      </LibModal>

      <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Shelf" message={`Delete shelf "${deleteTarget ? shelfLabel(deleteTarget) : ''}"?`} confirmLabel="Delete" loading={deleting} />

      <LibDataTable
        data={shelves}
        rowKey={(s) => s.id}
        loading={loading}
        emptyMessage="No shelves yet"
        emptyAction={<button onClick={openCreate} className="btn-primary"><Plus size={16} /> Add Shelf</button>}
        onView={setViewing}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
        columns={[
          {
            key: 'location',
            header: 'Location',
            render: (s) => (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-navy to-navy-light text-primary">
                  <MapPin size={16} />
                </div>
                <span className="font-semibold text-navy">{shelfLabel(s)}</span>
              </div>
            ),
          },
          { key: 'building', header: 'Building', className: 'hidden sm:table-cell', render: (s) => <span className="badge bg-navy/5 text-navy">{s.building}</span> },
          { key: 'section', header: 'Section', className: 'hidden md:table-cell', render: (s) => <span className="text-muted">{s.section}</span> },
          { key: 'capacity', header: 'Capacity', render: (s) => <span className="font-medium text-navy">{s.capacity ?? '—'}</span> },
        ]}
      />
    </LibPageLayout>
  );
}
