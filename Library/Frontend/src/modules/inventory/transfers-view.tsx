'use client';

import { useState, useEffect } from 'react';
import { ArrowLeftRight, Plus, AlertCircle } from 'lucide-react';
import { LibPageLayout } from '@/components/lib-page-layout';
import { LibDataTable } from '@/components/lib-data-table';
import { StatusBadge } from '@/components/status-badge';
import { LibModal, FormField } from '@/components/lib-modal';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { libApi } from '@/services/lib-api';
import type { BookTransfer } from '@/types';

export default function TransfersView() {
  const [transfers, setTransfers] = useState<BookTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewing, setViewing] = useState<BookTransfer | null>(null);
  const [approveTarget, setApproveTarget] = useState<BookTransfer | null>(null);
  const [form, setForm] = useState({ copyId: '', toOrgId: '', notes: '', requestedBy: 'Librarian' });
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await libApi.getTransfers();
      setTransfers(Array.isArray(data) ? data : data.transfers ?? []);
    } catch { setTransfers([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await libApi.createTransfer(form);
      setModalOpen(false);
      setForm({ copyId: '', toOrgId: '', notes: '', requestedBy: 'Librarian' });
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create transfer');
    } finally { setSaving(false); }
  };

  const handleApprove = async () => {
    if (!approveTarget) return;
    setApproving(true);
    try {
      await libApi.approveTransfer(approveTarget.id, { approvedBy: 'Librarian' });
      setApproveTarget(null);
      load();
    } catch { /* api */ } finally { setApproving(false); }
  };

  return (
    <LibPageLayout
      title="Transfers"
      subtitle="Track book transfers between locations"
      actions={
        <button onClick={() => { setError(''); setModalOpen(true); }} className="btn-primary">
          <Plus size={16} /> New Transfer
        </button>
      }
      kpis={[
        { label: 'Pending', value: transfers.filter((t) => t.status === 'PENDING').length, icon: <ArrowLeftRight size={20} /> },
        { label: 'Total', value: transfers.length, icon: <ArrowLeftRight size={20} /> },
      ]}
    >
      <LibModal open={modalOpen} onClose={() => setModalOpen(false)} title="Request Transfer" subtitle="Transfer a book copy to another location">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <FormField label="Copy ID" required>
            <input className="input font-mono text-sm" value={form.copyId} onChange={(e) => setForm((p) => ({ ...p, copyId: e.target.value }))} required placeholder="Book copy UUID" />
          </FormField>
          <FormField label="Destination Org ID" required>
            <input className="input" value={form.toOrgId} onChange={(e) => setForm((p) => ({ ...p, toOrgId: e.target.value }))} required />
          </FormField>
          <FormField label="Requested By">
            <input className="input" value={form.requestedBy} onChange={(e) => setForm((p) => ({ ...p, requestedBy: e.target.value }))} />
          </FormField>
          <FormField label="Notes">
            <textarea className="input min-h-[60px]" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          </FormField>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Submitting…' : 'Submit'}</button>
          </div>
        </form>
      </LibModal>

      <LibModal open={Boolean(viewing)} onClose={() => setViewing(null)} title="Transfer Details" size="md">
        {viewing && (
          <div className="space-y-3 text-sm">
            <p><span className="font-bold text-muted">Copy:</span> <span className="font-mono">{viewing.copyId}</span></p>
            <p><span className="font-bold text-muted">Requested by:</span> {viewing.requestedBy}</p>
            <p><span className="font-bold text-muted">To org:</span> {viewing.toOrgId}</p>
            <StatusBadge status={viewing.status} />
            {viewing.notes && <p className="text-navy">{viewing.notes}</p>}
            {viewing.status === 'PENDING' && (
              <button onClick={() => { setApproveTarget(viewing); setViewing(null); }} className="btn-primary">Approve Transfer</button>
            )}
          </div>
        )}
      </LibModal>

      <ConfirmDialog
        open={Boolean(approveTarget)}
        onClose={() => setApproveTarget(null)}
        onConfirm={handleApprove}
        title="Approve Transfer"
        message="Approve this book transfer?"
        confirmLabel="Approve"
        variant="default"
        loading={approving}
      />

      <LibDataTable
        data={transfers}
        rowKey={(t) => t.id}
        loading={loading}
        emptyMessage="No transfers yet"
        onView={setViewing}
        onEdit={(t) => t.status === 'PENDING' && setApproveTarget(t)}
        columns={[
          { key: 'copy', header: 'Copy ID', render: (t) => <span className="font-mono text-xs font-semibold text-navy">{t.copyId.slice(0, 12)}…</span> },
          { key: 'by', header: 'Requested By', render: (t) => <span className="font-medium text-navy">{t.requestedBy}</span> },
          { key: 'date', header: 'Date', className: 'hidden sm:table-cell', render: (t) => <span className="text-muted">{new Date(t.createdAt).toLocaleDateString()}</span> },
          { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
        ]}
      />
    </LibPageLayout>
  );
}
