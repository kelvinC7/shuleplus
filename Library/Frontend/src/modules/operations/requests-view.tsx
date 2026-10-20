'use client';

import { useState, useEffect } from 'react';
import { FileText, Plus, AlertCircle } from 'lucide-react';
import { LibPageLayout } from '@/components/lib-page-layout';
import { LibModal, FormField } from '@/components/lib-modal';
import { LibDataTable } from '@/components/lib-data-table';
import { StatusBadge } from '@/components/status-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { BorrowerPicker, type BorrowerSelection } from '@/components/borrower-picker';
import { libApi } from '@/services/lib-api';
import type { BookRequest } from '@/types';

export default function RequestsView() {
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [borrowerType, setBorrowerType] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [borrower, setBorrower] = useState<BorrowerSelection | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [approveTarget, setApproveTarget] = useState<BookRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<BookRequest | null>(null);
  const [working, setWorking] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await libApi.getRequests();
      setRequests(Array.isArray(data) ? data : data.requests ?? []);
    } catch { setRequests([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!borrower) {
      setError('Select a requester');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await libApi.createRequest({
        requesterType: borrower.type,
        requesterId: borrower.id,
        requesterName: borrower.name,
        title,
        author: author || undefined,
        reason: reason || undefined,
        priority,
      });
      setModalOpen(false);
      setBorrower(null);
      setTitle('');
      setAuthor('');
      setReason('');
      setPriority('MEDIUM');
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create request');
    } finally { setSaving(false); }
  };

  const handleReview = async (status: 'APPROVED' | 'REJECTED') => {
    const target = status === 'APPROVED' ? approveTarget : rejectTarget;
    if (!target) return;
    setWorking(true);
    try {
      await libApi.reviewRequest(target.id, { status, reviewedBy: 'Librarian' });
      setApproveTarget(null);
      setRejectTarget(null);
      load();
    } catch { /* api */ } finally { setWorking(false); }
  };

  return (
    <LibPageLayout
      title="Book Requests"
      subtitle="Manage book acquisition requests"
      actions={
        <button onClick={() => { setError(''); setModalOpen(true); }} className="btn-primary">
          <Plus size={16} /> New Request
        </button>
      }
      kpis={[
        { label: 'Pending', value: requests.filter((r) => r.status === 'PENDING').length, icon: <FileText size={20} /> },
        { label: 'Total', value: requests.length, icon: <FileText size={20} /> },
      ]}
    >
      <LibModal open={modalOpen} onClose={() => setModalOpen(false)} title="New Book Request" subtitle="Request a book for the library" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <BorrowerPicker borrowerType={borrowerType} onTypeChange={setBorrowerType} value={borrower} onChange={setBorrower} />
          <FormField label="Book Title" required>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Title of the book" />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Author">
              <input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Author name" />
            </FormField>
            <FormField label="Priority">
              <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField label="Reason">
            <textarea className="input min-h-[80px]" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why this book should be acquired" />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving || !borrower} className="btn-primary">
              {saving ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </LibModal>

      <ConfirmDialog open={Boolean(approveTarget)} onClose={() => setApproveTarget(null)} onConfirm={() => handleReview('APPROVED')} title="Approve Request" message={`Approve request for "${approveTarget?.title}"?`} confirmLabel="Approve" variant="default" loading={working} />
      <ConfirmDialog open={Boolean(rejectTarget)} onClose={() => setRejectTarget(null)} onConfirm={() => handleReview('REJECTED')} title="Reject Request" message={`Reject request for "${rejectTarget?.title}"?`} confirmLabel="Reject" loading={working} />

      <LibDataTable
        data={requests}
        rowKey={(r) => r.id}
        loading={loading}
        emptyMessage="No requests found"
        onEdit={(r) => r.status === 'PENDING' && setApproveTarget(r)}
        onDelete={(r) => r.status === 'PENDING' && setRejectTarget(r)}
        columns={[
          {
            key: 'requester',
            header: 'Requested By',
            render: (r) => (
              <span>
                <span className="font-semibold text-navy">{r.requesterName}</span>
                <span className="ml-1.5 badge bg-navy/5 text-navy text-[10px]">{r.requesterType}</span>
              </span>
            ),
          },
          { key: 'title', header: 'Book', render: (r) => <span className="font-semibold text-navy">{r.title}</span> },
          { key: 'author', header: 'Author', className: 'hidden sm:table-cell', render: (r) => <span className="text-muted">{r.author ?? '—'}</span> },
          {
            key: 'priority',
            header: 'Priority',
            className: 'hidden sm:table-cell',
            render: (r) => (
              <span className={`badge text-[11px] font-bold ${
                r.priority === 'URGENT' ? 'bg-red-50 text-danger' :
                r.priority === 'HIGH' ? 'bg-amber-50 text-amber-700' :
                'bg-slate-100 text-slate-600'
              }`}>{r.priority}</span>
            ),
          },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        ]}
      />
      <p className="mt-3 text-xs text-muted">Edit = Approve · Delete = Reject (pending only)</p>
    </LibPageLayout>
  );
}
